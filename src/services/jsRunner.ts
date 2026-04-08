export interface JavaScriptRunResult {
    logs: string[];
    result?: string;
    error?: string;
    timedOut: boolean;
    durationMs: number;
}

type WorkerResponse =
    | { type: "log"; text: string }
    | { type: "done"; result: string }
    | { type: "error"; error: string };

const WORKER_SOURCE = `
const toText = (value) => {
  if (typeof value === "string") return value;
  if (value === undefined) return "undefined";
  if (value instanceof Error) return value.name + ": " + value.message;

  try {
    const json = JSON.stringify(value);
    if (json !== undefined) return json;
  } catch {
    return "[Circular]";
  }

  return String(value);
};

self.onmessage = async (event) => {
  const code = typeof event.data?.code === "string" ? event.data.code : "";

  const proxyConsole = {
    log: (...args) => self.postMessage({ type: "log", text: args.map(toText).join(" ") }),
    warn: (...args) => self.postMessage({ type: "log", text: args.map(toText).join(" ") }),
    error: (...args) => self.postMessage({ type: "log", text: args.map(toText).join(" ") }),
  };

  try {
    const runner = new Function("console", '"use strict";\\n' + code);
    const output = runner(proxyConsole);
    const resolved = output instanceof Promise ? await output : output;
    self.postMessage({ type: "done", result: toText(resolved) });
  } catch (err) {
    const errorText = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: "error", error: errorText });
  }
};
`;

export async function runJavaScriptCode(code: string, timeoutMs = 4000): Promise<JavaScriptRunResult> {
    const blob = new Blob([WORKER_SOURCE], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    const logs: string[] = [];
    const startedAt = performance.now();

    return new Promise((resolve) => {
        let settled = false;

        const finalize = (result: Omit<JavaScriptRunResult, "durationMs" | "logs"> & { logs?: string[] }) => {
            if (settled) {
                return;
            }

            settled = true;
            worker.terminate();
            URL.revokeObjectURL(workerUrl);

            resolve({
                logs: result.logs ?? logs,
                timedOut: result.timedOut,
                result: result.result,
                error: result.error,
                durationMs: Math.round(performance.now() - startedAt),
            });
        };

        const timeoutId = window.setTimeout(() => {
            finalize({ timedOut: true, error: "Tiempo limite alcanzado (4.5s).", logs });
        }, timeoutMs);

        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
            const data = event.data;

            if (data.type === "log") {
                logs.push(data.text);
                return;
            }

            window.clearTimeout(timeoutId);

            if (data.type === "done") {
                finalize({ timedOut: false, result: data.result, logs });
                return;
            }

            finalize({ timedOut: false, error: data.error, logs });
        };

        worker.onerror = (event) => {
            window.clearTimeout(timeoutId);
            finalize({ timedOut: false, error: event.message || "Error interno en el runner JS.", logs });
        };

        worker.postMessage({ code });
    });
}
