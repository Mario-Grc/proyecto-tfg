import { useCallback, useEffect, useRef, useState } from "react";
import {
    sendMessage,
    ConversationMessage,
    DEFAULT_API_ENDPOINT,
    DEFAULT_MODEL_NAME,
} from "../services/llmService";
import { Message } from "../types";
import usePersistentState from "./usePersistentState";

interface SendPromptOptions {
    text: string;
    selectedCode?: string;
}

interface UseTutorChatOptions {
    initialSystemPrompt: ConversationMessage;
}

function readStoredConversation(initialSystemPrompt: ConversationMessage): ConversationMessage[] {
    try {
        const stored = localStorage.getItem("full_conversation");
        return stored ? (JSON.parse(stored) as ConversationMessage[]) : [initialSystemPrompt];
    } catch {
        return [initialSystemPrompt];
    }
}

function readStoredNextMessageId(): number {
    try {
        const stored = localStorage.getItem("next_message_id");
        return stored ? (JSON.parse(stored) as number) : 1;
    } catch {
        return 1;
    }
}

function buildContentForModel(trimmedText: string, selectedCode: string): string {
    if (!selectedCode) {
        return trimmedText;
    }

    return [
        trimmedText,
        "",
        "Contexto de codigo seleccionado automaticamente:",
        "```javascript",
        selectedCode,
        "```",
    ].join("\n");
}

function buildContentForChat(trimmedText: string, selectedCode: string): string {
    if (!selectedCode) {
        return trimmedText;
    }

    return `${trimmedText}\n\n(Se adjunto automaticamente tu seleccion de codigo al modelo.)`;
}

export default function useTutorChat({ initialSystemPrompt }: UseTutorChatOptions) {
    const [messages, setMessages] = usePersistentState<Message[]>("chat_messages", []);
    const [status, setStatus] = useState("Listo para enviar.");
    const [loading, setLoading] = useState(false);
    const [inputText, setInputText] = useState("");
    const [apiEndpoint, setApiEndpoint] = usePersistentState<string>("llm_api_endpoint", DEFAULT_API_ENDPOINT);
    const [modelName, setModelName] = usePersistentState<string>("llm_model_name", DEFAULT_MODEL_NAME);

    const conversationRef = useRef<ConversationMessage[]>(readStoredConversation(initialSystemPrompt));
    const nextIdRef = useRef<number>(readStoredNextMessageId());

    useEffect(() => {
        localStorage.setItem("full_conversation", JSON.stringify(conversationRef.current));
        localStorage.setItem("next_message_id", JSON.stringify(nextIdRef.current));
    }, [messages]);

    const sendPrompt = useCallback(async ({ text, selectedCode = "" }: SendPromptOptions) => {
        const trimmedText = text.trim();

        if (!trimmedText || loading) {
            return;
        }

        const normalizedCode = selectedCode.trim();
        const userContentForModel = buildContentForModel(trimmedText, normalizedCode);
        const userContentForChat = buildContentForChat(trimmedText, normalizedCode);

        const userId = nextIdRef.current++;
        setMessages((prev) => [...prev, { id: userId, text: userContentForChat, type: "user" }]);
        conversationRef.current.push({ role: "user", content: userContentForModel });

        setLoading(true);
        setStatus(normalizedCode ? "Consultando al modelo con tu seleccion de codigo..." : "Consultando al modelo...");

        try {
            const response = await sendMessage(conversationRef.current, {
                endpoint: apiEndpoint,
                model: modelName,
            });

            const llmId = nextIdRef.current++;
            setMessages((prev) => [...prev, { id: llmId, text: response.text, type: "llm" }]);
            conversationRef.current.push({ role: "assistant", content: response.rawText });

            if (response.usage) {
                setStatus(`Respuesta recibida - ${response.usage.total_tokens} tokens usados`);
            } else {
                setStatus("Respuesta recibida.");
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error desconocido";
            const errorId = nextIdRef.current++;
            setMessages((prev) => [...prev, { id: errorId, text: message, type: "llm" }]);
            setStatus(`Fallo: ${message}`);
        } finally {
            setLoading(false);
        }
    }, [apiEndpoint, loading, modelName, setMessages]);

    const resetConversation = useCallback((nextSystemPrompt: ConversationMessage) => {
        setMessages([]);
        setInputText("");
        nextIdRef.current = 1;
        conversationRef.current = [nextSystemPrompt];

        localStorage.removeItem("chat_messages");
        localStorage.setItem("full_conversation", JSON.stringify([nextSystemPrompt]));
        localStorage.removeItem("next_message_id");
    }, [setMessages]);

    const clearConversation = useCallback((nextSystemPrompt: ConversationMessage) => {
        resetConversation(nextSystemPrompt);
        setStatus("Conversacion borrada.");
    }, [resetConversation]);

    const saveLLMSettings = useCallback((endpoint: string, model: string) => {
        setApiEndpoint(endpoint);
        setModelName(model);
        setStatus("Configuracion LLM actualizada.");
    }, [setApiEndpoint, setModelName]);

    return {
        messages,
        status,
        setStatus,
        loading,
        inputText,
        setInputText,
        apiEndpoint,
        modelName,
        sendPrompt,
        clearConversation,
        resetConversation,
        saveLLMSettings,
    };
}
