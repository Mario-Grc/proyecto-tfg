import { useCallback, useEffect, useRef, useState } from "react";
import type { MessageRole, SessionMessageRecord } from "../../shared/types";
import { fetchSessionMessages, sendChatRequest } from "../services/backendApi";
import type { Message } from "../types";

interface SendPromptOptions {
    text: string;
    selectedCode?: string;
}

interface UseTutorChatOptions {
    sessionId: string | null;
}

export type ChatSendResult = "success" | "error" | "ignored";

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Error desconocido";
}

function buildContentForChat(trimmedText: string, selectedCode: string): string {
    if (!selectedCode) {
        return trimmedText;
    }

    return `${trimmedText}\n\n(Se adjunto automaticamente tu seleccion de código al modelo.)`;
}

function roleToChatType(role: MessageRole): Message["type"] | null {
    if (role === "user") {
        return "user";
    }

    if (role === "assistant") {
        return "llm";
    }

    if (role === "tool") {
        return "tool";
    }

    return null;
}

function mapStoredMessagesToChat(messages: SessionMessageRecord[]): Message[] {
    return messages
        .map((message): Message | null => {
            const mappedType = roleToChatType(message.role);

            if (!mappedType) {
                return null;
            }

            return {
                id: message.id,
                text: normalizeMessageTextForChat(mappedType, message.content),
                type: mappedType,
            };
        })
        .filter((message): message is Message => message !== null);
}

function buildLocalMessageId(prefix: string, seq: number): string {
    return `${prefix}-${Date.now()}-${seq}`;
}

function toSingleLinePreview(text: string, maxChars = 140): string {
    const normalized = text.replace(/\s+/g, " ").trim();

    if (!normalized) {
        return "sin salida";
    }

    if (normalized.length <= maxChars) {
        return normalized;
    }

    return `${normalized.slice(0, maxChars)}...`;
}

function extractToolName(rawToolMessage: string): string {
    const firstLine = rawToolMessage.split("\n", 1)[0]?.trim() ?? "";

    if (!firstLine.startsWith("[Herramienta]")) {
        return "Herramienta";
    }

    const normalized = firstLine.replace(/^\[Herramienta\]\s*/, "").trim();
    return normalized || "Herramienta";
}

function extractToolStatus(rawToolMessage: string): string | null {
    const statusMatch = rawToolMessage.match(/(?:^|\n)Estado:\s*(.+)(?:\n|$)/i);

    if (!statusMatch) {
        return null;
    }

    const status = statusMatch[1]?.trim() ?? "";
    return status || null;
}

function extractToolResult(rawToolMessage: string): string {
    const resultSectionMatch = rawToolMessage.match(/(?:^|\n)Resultado:\s*\n([\s\S]*)$/i);

    if (!resultSectionMatch) {
        return rawToolMessage;
    }

    return resultSectionMatch[1] ?? "";
}

function formatToolMessageForChat(rawToolMessage: string): string {
    const toolName = extractToolName(rawToolMessage);
    const status = extractToolStatus(rawToolMessage);
    const resultPreview = toSingleLinePreview(extractToolResult(rawToolMessage), 220);

    return [
        `[Herramienta] ${toolName}`,
        status ? `Estado: ${status}` : null,
        "Resultado:",
        resultPreview,
    ]
        .filter((line): line is string => Boolean(line))
        .join("\n");
}

function normalizeMessageTextForChat(type: Message["type"], text: string): string {
    if (type === "tool") {
        return formatToolMessageForChat(text);
    }

    return text;
}

function buildToolResultMessage(toolName: string, result: string): string {
    return formatToolMessageForChat([`[Herramienta] ${toolName}`, "Resultado:", result].join("\n"));
}

export default function useTutorChat({ sessionId }: UseTutorChatOptions) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [status, setStatus] = useState("Selecciona un problema para empezar.");
    const [loading, setLoading] = useState(false);
    const [inputText, setInputText] = useState("");
    const localMessageSeqRef = useRef<number>(1);

    const loadSessionHistory = useCallback(async (targetSessionId: string) => {
        setLoading(true);
        setStatus("Cargando historial de la sesión...");

        try {
            const storedMessages = await fetchSessionMessages(targetSessionId);
            setMessages(mapStoredMessagesToChat(storedMessages));
            setStatus(storedMessages.length > 0 ? "Historial cargado." : "Sesión lista para empezar.");
        } catch (error) {
            const message = getErrorMessage(error);
            setMessages([]);
            setStatus(`No se pudo cargar la sesión: ${message}`);
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

        if (!sessionId) {
            setStatus("No hay una sesión activa para enviar mensajes.");
            return "error";
        }

        const normalizedCode = selectedCode.trim();
        const userContentForChat = buildContentForChat(trimmedText, normalizedCode);

        const userId = buildLocalMessageId("user", localMessageSeqRef.current++);
        const assistantId = buildLocalMessageId("assistant", localMessageSeqRef.current++);
        setMessages((prev) => [
            ...prev,
            { id: userId, text: userContentForChat, type: "user" },
            { id: assistantId, text: "", type: "llm" },
        ]);

        setLoading(true);
        setStatus(normalizedCode ? "Generando respuesta con tu seleccion de código..." : "Generando respuesta...");

        const applyAssistantText = (updater: (currentText: string) => string) => {
            setMessages((prev) =>
                prev.map((message) =>
                    message.id === assistantId
                        ? {
                            ...message,
                            text: updater(message.text),
                        }
                        : message,
                ),
            );
        };

        const insertToolResultMessage = (toolName: string, result: string) => {
            const toolMessageId = buildLocalMessageId("tool", localMessageSeqRef.current++);
            const toolMessage: Message = {
                id: toolMessageId,
                text: buildToolResultMessage(toolName, result),
                type: "tool",
            };

            setMessages((prev) => {
                const assistantIndex = prev.findIndex((message) => message.id === assistantId);

                if (assistantIndex === -1) {
                    return [...prev, toolMessage];
                }

                return [
                    ...prev.slice(0, assistantIndex),
                    toolMessage,
                    ...prev.slice(assistantIndex),
                ];
            });
        };

        try {
            const response = await sendChatRequest(
                {
                    sessionId,
                    text: trimmedText,
                    selectedCode: normalizedCode || undefined,
                },
                {
                    onDelta: (deltaText) => {
                        if (!deltaText) {
                            return;
                        }

                        applyAssistantText((currentText) => `${currentText}${deltaText}`);
                    },
                    onToolStart: (toolName) => {
                        setStatus(`Ejecutando herramienta: ${toolName}...`);
                    },
                    onToolResult: (toolName, result) => {
                        insertToolResultMessage(toolName, result);
                        setStatus(`Resultado ${toolName}: ${toSingleLinePreview(result)}`);
                    },
                },
            );

            applyAssistantText(() => response.assistantText);

            if (response.usage) {
                setStatus(`Respuesta recibida - ${response.usage.total_tokens} tokens usados`);
            } else {
                setStatus("Respuesta recibida.");
            }

            return "success";
        } catch (error) {
            const message = getErrorMessage(error);
            const errorId = buildLocalMessageId("error", localMessageSeqRef.current++);
            setMessages((prev) => {
                const withoutEmptyAssistant = prev.filter(
                    (chatMessage) => !(chatMessage.id === assistantId && chatMessage.text.trim().length === 0),
                );

                return [...withoutEmptyAssistant, { id: errorId, text: message, type: "llm" }];
            });
            setStatus(`Fallo: ${message}`);

            return "error";
        } finally {
            setLoading(false);
        }
    }, [loading, sessionId]);

    const resetConversation = useCallback(() => {
        setMessages([]);
        setInputText("");
        localMessageSeqRef.current = 1;
    }, []);

    const clearConversation = useCallback(() => {
        resetConversation();
        setStatus("Conversación borrada.");
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
    };
}
