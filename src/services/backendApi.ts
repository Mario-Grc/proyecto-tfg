import type {
    ApiErrorResponse,
    ChatRequest,
    ChatResponse,
    ProblemRecord,
    SessionMessageRecord,
    SessionRecord,
} from "../../shared/types";

const DEFAULT_API_BASE = "http://localhost:3001/api";
const configuredApiBase = (import.meta.env.VITE_BACKEND_API_BASE as string | undefined)?.trim();
const API_BASE = (configuredApiBase && configuredApiBase.length > 0 ? configuredApiBase : DEFAULT_API_BASE).replace(/\/+$/, "");

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

export async function sendChatRequest(payload: ChatRequest): Promise<ChatResponse> {
    return requestJson<ChatResponse>("/chat", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}
