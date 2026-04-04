import { useCallback, useState } from "react";
import { runJavaScriptCode } from "../services/jsRunner";

export type JavaScriptRunStatus = "success" | "error" | "ignored";

export default function useJavaScriptRunner() {
    const [runningCode, setRunningCode] = useState(false);
    const [runOutput, setRunOutput] = useState("Aun no has ejecutado codigo.");

    const runCode = useCallback(async (code: string): Promise<JavaScriptRunStatus> => {
        if (runningCode) {
            return "ignored";
        }

        if (!code.trim()) {
            setRunOutput("No hay codigo en el editor.");
            return "ignored";
        }

        setRunningCode(true);
        setRunOutput("Ejecutando...");

        try {
            const result = await runJavaScriptCode(code, 4500);
            const blocks: string[] = [];

            if (result.logs.length > 0) {
                blocks.push(result.logs.join("\n"));
            }

            const hasError = Boolean(result.error);

            if (hasError) {
                blocks.push(`Error: ${result.error}`);
            } else if (result.result && result.result !== "undefined") {
                blocks.push(`=> ${result.result}`);
            }

            if (blocks.length === 0) {
                blocks.push("Sin salida.");
            }

            setRunOutput(blocks.join("\n\n"));

            return hasError ? "error" : "success";
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error desconocido al ejecutar JavaScript.";
            setRunOutput(`Error: ${message}`);
            return "error";
        } finally {
            setRunningCode(false);
        }
    }, [runningCode]);

    return {
        runningCode,
        runOutput,
        runCode,
    };
}
