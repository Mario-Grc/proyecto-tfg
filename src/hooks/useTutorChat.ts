import { useCallback, useEffect, useRef, useState } from "react";
import type { CodeLanguage, MessageRole, SessionMessageRecord } from "../../shared/types";
import { fetchSessionMessages, sendChatRequest } from "../services/backendApi";
import type { Message } from "../types";
import { useTranslation } from "../i18n/LanguageContext";

interface SendPromptOptions {
    text: string;
    editorCode?: string;
    selectedCode?: string;
    language?: CodeLanguage;
}

interface UseTutorChatOptions {
    sessionId: string | null;
}

export type ChatSendResult = "success" | "error" | "ignored" | "aborted";

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Error desconocido";
}

function normalizeUserMessageForChat(text: string): string {
    const codeContextMarker = "\n\nEste es el codigo completo del editor actual del usuario:";
    const markerIndex = text.indexOf(codeContextMarker);

    if (markerIndex === -1) {
        return text;
    }

    return text.slice(0, markerIndex).trimEnd();
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
                text: mappedType === "user" ? normalizeUserMessageForChat(message.content) : normalizeMessageTextForChat(mappedType, message.content),
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
    const { translate, language: uiLanguage } = useTranslation();
    const [messages, setMessages] = useState<Message[]>([]);
    const [status, setStatus] = useState(() => translate("status.idle"));
    const [loading, setLoading] = useState(false);
    const [inputText, setInputText] = useState("");
    const localMessageSeqRef = useRef<number>(1);
    const abortRef = useRef<AbortController | null>(null);

    const loadSessionHistory = useCallback(async (targetSessionId: string) => {
        setLoading(true);
        setStatus(translate("status.loadingHistory"));

        try {
            const storedMessages = await fetchSessionMessages(targetSessionId);
            setMessages(mapStoredMessagesToChat(storedMessages));
            setStatus(translate("status.idle"));
        } catch (error) {
            const message = getErrorMessage(error);
            setMessages([]);
            setStatus(translate("status.loadHistoryError", { message }));
        } finally {
            setLoading(false);
        }
    }, [translate]);

    useEffect(() => {
        abortRef.current?.abort();
        setInputText("");

        if (!sessionId) {
            setMessages([]);
            setStatus(translate("status.idle"));
            return;
        }

        void loadSessionHistory(sessionId);
    }, [loadSessionHistory, sessionId, translate]);

    useEffect(() => () => {
        abortRef.current?.abort();
    }, []);

    const sendPrompt = useCallback(
        async ({ text, editorCode = "", selectedCode = "", language }: SendPromptOptions): Promise<ChatSendResult> => {
        const trimmedText = text.trim();

        if (!trimmedText || loading) {
            return "ignored";
        }

        if (!sessionId) {
            setStatus(translate("status.noSession"));
            return "error";
        }

        const normalizedEditorCode = editorCode.trim();
        const normalizedCode = selectedCode.trim();

        const userId = buildLocalMessageId("user", localMessageSeqRef.current++);
        const assistantId = buildLocalMessageId("assistant", localMessageSeqRef.current++);
        setMessages((prev) => [
            ...prev,
            { id: userId, text: trimmedText, type: "user" },
            { id: assistantId, text: "", type: "llm" },
        ]);

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setStatus(translate("status.generating"));

        const requestStartedAt = performance.now();
        let firstTokenAt: number | null = null;

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
                    editorCode: normalizedEditorCode || undefined,
                    selectedCode: normalizedCode || undefined,
                    language,
                    responseLanguage: uiLanguage,
                },
                {
                    onDelta: (deltaText) => {
                        if (!deltaText) {
                            return;
                        }

                        if (firstTokenAt === null) {
                            firstTokenAt = performance.now();
                        }

                        applyAssistantText((currentText) => `${currentText}${deltaText}`);
                    },
                    onToolResult: (toolName, result) => {
                        insertToolResultMessage(toolName, result);
                    },
                    signal: controller.signal,
                },
            );

            applyAssistantText(() => response.assistantText);

            const totalSec = ((performance.now() - requestStartedAt) / 1000).toFixed(1);
            const ttftSec = firstTokenAt !== null
                ? ((firstTokenAt - requestStartedAt) / 1000).toFixed(1)
                : null;

            const statusParts = [`${translate("status.totalTime")} ${totalSec}s`];
            if (ttftSec !== null) statusParts.push(`${translate("status.firstToken")} ${ttftSec}s`);
            if (response.usage) statusParts.push(`${response.usage.total_tokens} ${translate("status.tokens")}`);

            setStatus(`${translate("status.responseReceived")}: ${statusParts.join(", ")}`);

            return "success";
        } catch (error) {
            // generacion cancelada al salir del workspace o cambiar de sesion
            if (controller.signal.aborted) {
                setMessages((prev) =>
                    prev.filter(
                        (chatMessage) => !(chatMessage.id === assistantId && chatMessage.text.trim().length === 0),
                    ),
                );
                setStatus(translate("status.idle"));
                return "aborted";
            }

            const message = getErrorMessage(error);
            const errorId = buildLocalMessageId("error", localMessageSeqRef.current++);
            setMessages((prev) => {
                const withoutEmptyAssistant = prev.filter(
                    (chatMessage) => !(chatMessage.id === assistantId && chatMessage.text.trim().length === 0),
                );

                return [...withoutEmptyAssistant, { id: errorId, text: message, type: "llm" }];
            });
            setStatus(translate("status.failure", { message }));

            return "error";
        } finally {
            setLoading(false);
        }
    }, [loading, sessionId, translate, uiLanguage]);

    const appendAssistantMessage = useCallback((text: string) => {
        const trimmed = text.trim();

        if (!trimmed) {
            return;
        }

        const assistantId = buildLocalMessageId("assistant", localMessageSeqRef.current++);
        setMessages((prev) => [...prev, { id: assistantId, text: trimmed, type: "llm" }]);
    }, []);

    const stopGeneration = useCallback(() => {
        abortRef.current?.abort();
    }, []);

    const resetConversation = useCallback(() => {
        setMessages([]);
        setInputText("");
        localMessageSeqRef.current = 1;
    }, []);

    const clearConversation = useCallback(() => {
        resetConversation();
        setStatus(translate("status.idle"));
    }, [resetConversation, translate]);

    return {
        messages,
        status,
        setStatus,
        loading,
        inputText,
        setInputText,
        sendPrompt,
        appendAssistantMessage,
        clearConversation,
        resetConversation,
        stopGeneration,
    };
}
