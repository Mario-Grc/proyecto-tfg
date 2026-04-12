import { useCallback, useEffect, useRef, useState } from "react";
import type { MessageRole, SessionMessageRecord } from "../../shared/types";
import { fetchSessionMessages, sendChatRequest } from "../services/backendApi";
import { Message } from "../types";

interface SendPromptOptions {
    text: string;
    selectedCode?: string;
}

interface UseTutorChatOptions {
    sessionId: string | null;
    problemId: string | null;
}

export type ChatSendResult = "success" | "error" | "ignored";

function buildContentForChat(trimmedText: string, selectedCode: string): string {
    if (!selectedCode) {
        return trimmedText;
    }

    return `${trimmedText}\n\n(Se adjunto automaticamente tu seleccion de codigo al modelo.)`;
}

function roleToChatType(role: MessageRole): Message["type"] | null {
    if (role === "user") {
        return "user";
    }

    if (role === "assistant") {
        return "llm";
    }

    return null;
}

function mapStoredMessagesToChat(messages: SessionMessageRecord[]): Message[] {
    return messages
        .map((message) => {
            const mappedType = roleToChatType(message.role);

            if (!mappedType) {
                return null;
            }

            return {
                id: message.id,
                text: message.content,
                type: mappedType,
            } satisfies Message;
        })
        .filter((message): message is Message => message !== null);
}

function buildLocalMessageId(prefix: string, seq: number): string {
    return `${prefix}-${Date.now()}-${seq}`;
}

export default function useTutorChat({ sessionId, problemId }: UseTutorChatOptions) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [status, setStatus] = useState("Selecciona un problema para empezar.");
    const [loading, setLoading] = useState(false);
    const [inputText, setInputText] = useState("");
    const localMessageSeqRef = useRef<number>(1);

    const loadSessionHistory = useCallback(async (targetSessionId: string) => {
        setLoading(true);
        setStatus("Cargando historial de la sesion...");

        try {
            const storedMessages = await fetchSessionMessages(targetSessionId);
            setMessages(mapStoredMessagesToChat(storedMessages));
            setStatus(storedMessages.length > 0 ? "Historial cargado." : "Sesion lista para empezar.");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error desconocido";
            setMessages([]);
            setStatus(`No se pudo cargar la sesion: ${message}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setInputText("");

        if (!sessionId) {
            setMessages([]);
            setStatus("Selecciona un problema para empezar.");
            return;
        }

        void loadSessionHistory(sessionId);
    }, [loadSessionHistory, sessionId]);

    const sendPrompt = useCallback(async ({ text, selectedCode = "" }: SendPromptOptions): Promise<ChatSendResult> => {
        const trimmedText = text.trim();

        if (!trimmedText || loading) {
            return "ignored";
        }

        if (!sessionId || !problemId) {
            setStatus("No hay una sesion activa para enviar mensajes.");
            return "error";
        }

        const normalizedCode = selectedCode.trim();
        const userContentForChat = buildContentForChat(trimmedText, normalizedCode);

        const userId = buildLocalMessageId("user", localMessageSeqRef.current++);
        setMessages((prev) => [...prev, { id: userId, text: userContentForChat, type: "user" }]);

        setLoading(true);
        setStatus(normalizedCode ? "Consultando al modelo con tu seleccion de codigo..." : "Consultando al modelo...");

        try {
            const response = await sendChatRequest({
                sessionId,
                problemId,
                text: trimmedText,
                selectedCode: normalizedCode || undefined,
            });

            const llmId = buildLocalMessageId("assistant", localMessageSeqRef.current++);
            setMessages((prev) => [...prev, { id: llmId, text: response.assistantText, type: "llm" }]);

            if (response.usage) {
                setStatus(`Respuesta recibida - ${response.usage.total_tokens} tokens usados`);
            } else {
                setStatus("Respuesta recibida.");
            }

            return "success";
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error desconocido";
            const errorId = buildLocalMessageId("error", localMessageSeqRef.current++);
            setMessages((prev) => [...prev, { id: errorId, text: message, type: "llm" }]);
            setStatus(`Fallo: ${message}`);

            return "error";
        } finally {
            setLoading(false);
        }
    }, [loading, problemId, sessionId]);

    const resetConversation = useCallback(() => {
        setMessages([]);
        setInputText("");
        localMessageSeqRef.current = 1;
    }, []);

    const clearConversation = useCallback(() => {
        resetConversation();
        setStatus("Conversacion borrada.");
    }, [resetConversation]);

    return {
        messages,
        status,
        setStatus,
        loading,
        inputText,
        setInputText,
        sendPrompt,
        clearConversation,
        resetConversation,
        loadSessionHistory,
    };
}
