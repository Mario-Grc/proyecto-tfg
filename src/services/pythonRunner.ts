export interface PythonRunResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timedOut: boolean;
    durationMs: number;
    outputTruncated: boolean;
    spawnError?: string;
}

const DEFAULT_API_BASE = "http://localhost:3001/api";
const configuredApiBase = (import.meta.env.VITE_BACKEND_API_BASE as string | undefined)?.trim();
const API_BASE = (configuredApiBase && configuredApiBase.length > 0 ? configuredApiBase : DEFAULT_API_BASE).replace(/\/+$/, "");

export async function runPythonCode(code: string): Promise<PythonRunResult> {
    const response = await fetch(`${API_BASE}/run/python`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Error HTTP ${response.status} al ejecutar Python.`);
    }

    return response.json() as Promise<PythonRunResult>;
}
