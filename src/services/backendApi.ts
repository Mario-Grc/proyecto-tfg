import type {
    ApiErrorResponse,
    ChatRequest,
    ChatResponse,
    ChatStreamEvent,
    CreateProblemInput,
    ProblemRecord,
    SessionMessageRecord,
    SessionRecord,
} from "../../shared/types";

const DEFAULT_API_BASE = "http://localhost:3001/api";
const configuredApiBase = (import.meta.env.VITE_BACKEND_API_BASE as string | undefined)?.trim();
const API_BASE = (configuredApiBase && configuredApiBase.length > 0 ? configuredApiBase : DEFAULT_API_BASE).replace(/\/+$/, "");

interface SendChatRequestOptions {
    onDelta: (deltaText: string) => void;
    onToolStart?: (toolName: string) => void;
    onToolResult?: (toolName: string, result: string) => void;
}

function buildApiUrl(path: string): string {
    return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
        return response.json();
    }

    return response.text();
}

function extractErrorMessage(status: number, body: unknown): string {
    if (typeof body === "string" && body.trim()) {
        return body;
    }

    if (body && typeof body === "object" && "error" in body) {
        const apiError = body as ApiErrorResponse;
        if (typeof apiError.error === "string" && apiError.error.trim()) {
            return apiError.error;
        }
    }

    return `Error HTTP ${status}`;
}

function parseChatStreamEvent(rawEventData: string): ChatStreamEvent {
    let parsed: unknown;

    try {
        parsed = JSON.parse(rawEventData);
    } catch {
        throw new Error("El backend devolvio un evento de stream con JSON invalido.");
    }

    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
        throw new Error("El backend devolvio un evento de stream invalido.");
    }

    const asRecord = parsed as Record<string, unknown>;

    if (asRecord.type === "delta" && typeof asRecord.delta === "string") {
        return parsed as ChatStreamEvent;
    }

    if (asRecord.type === "tool_start" && typeof asRecord.toolName === "string") {
        return parsed as ChatStreamEvent;
    }

    if (asRecord.type === "tool_result" && typeof asRecord.toolName === "string" && typeof asRecord.result === "string") {
        return parsed as ChatStreamEvent;
    }

    if (asRecord.type === "done" && typeof asRecord.sessionId === "string" && typeof asRecord.assistantText === "string") {
        return parsed as ChatStreamEvent;
    }

    if (asRecord.type === "error" && typeof asRecord.error === "string") {
        return parsed as ChatStreamEvent;
    }

    throw new Error("El backend devolvio un evento de stream con formato inesperado.");
}

async function requestJson<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
    const headers = new Headers(init?.headers ?? {});

    if (!headers.has("Accept")) {
        headers.set("Accept", "application/json");
    }

    // Set Content-Type only when the request actually sends a body.
    if (init?.body !== undefined && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(buildApiUrl(path), {
        ...init,
        headers,
    });

    const body = await parseBody(response);

    if (!response.ok) {
        throw new Error(extractErrorMessage(response.status, body));
    }

    return body as TResponse;
}

export async function fetchProblems(): Promise<ProblemRecord[]> {
    return requestJson<ProblemRecord[]>("/problems", { method: "GET" });
}

export async function createProblem(payload: CreateProblemInput): Promise<ProblemRecord> {
    return requestJson<ProblemRecord>("/problems", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function createSession(problemId: string): Promise<SessionRecord> {
    return requestJson<SessionRecord>("/sessions", {
        method: "POST",
        body: JSON.stringify({ problemId }),
    });
}

export async function fetchSessionMessages(sessionId: string): Promise<SessionMessageRecord[]> {
    return requestJson<SessionMessageRecord[]>(`/sessions/${encodeURIComponent(sessionId)}/messages`, {
        method: "GET",
    });
}

export async function sendChatRequest(
    payload: ChatRequest,
    options: SendChatRequestOptions,
): Promise<ChatResponse> {
    let response: Response;

    try {
        response = await fetch(buildApiUrl("/chat"), {
            method: "POST",
            headers: {
                Accept: "text/event-stream",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
    } catch {
        throw new Error("No se pudo abrir el stream de chat.");
    }

    if (!response.ok) {
        const body = await parseBody(response);
        throw new Error(extractErrorMessage(response.status, body));
    }

    if (!response.body) {
        throw new Error("El backend no devolvio un stream utilizable.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    let finalResponse: ChatResponse | null = null;

    const applyEvent = (event: ChatStreamEvent) => {
        if (event.type === "delta") {
            options.onDelta(event.delta);
            return;
        }

        if (event.type === "tool_start") {
            options.onToolStart?.(event.toolName);
            return;
        }

        if (event.type === "tool_result") {
            options.onToolResult?.(event.toolName, event.result);
            return;
        }

        if (event.type === "done") {
            finalResponse = {
                sessionId: event.sessionId,
                assistantText: event.assistantText,
                usage: event.usage,
            };
            return;
        }

        if (event.type === "error") {
            throw new Error(event.error);
        }
    };

    try {
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                buffer += decoder.decode();
                break;
            }

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const rawLine of lines) {
                const line = rawLine.replace(/\r$/, "").trim();

                if (!line || !line.startsWith("data:")) {
                    continue;
                }

                const event = parseChatStreamEvent(line.slice(5).trimStart());
                applyEvent(event);

                if (finalResponse) {
                    break;
                }
            }

            if (finalResponse) {
                break;
            }
        }
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }

        throw new Error("Se perdio la conexion del stream de chat.");
    } finally {
        reader.releaseLock();
    }

    if (!finalResponse && buffer.trim().startsWith("data:")) {
        const event = parseChatStreamEvent(buffer.trim().slice(5).trimStart());
        applyEvent(event);
    }

    if (!finalResponse) {
        throw new Error("El stream termino sin enviar una respuesta final.");
    }

    return finalResponse;
}
