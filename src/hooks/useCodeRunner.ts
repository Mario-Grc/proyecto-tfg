import { useCallback, useState } from "react";
import type { CodeLanguage } from "../../shared/types";
import { runJavaScriptCode } from "../services/jsRunner";
import { runPythonCode } from "../services/pythonRunner";

export type CodeRunStatus = "success" | "error" | "ignored";

export default function useCodeRunner(language: CodeLanguage) {
    const [runningCode, setRunningCode] = useState(false);
    const [runOutput, setRunOutput] = useState("Aún no has ejecutado código.");

    const runCode = useCallback(async (code: string): Promise<CodeRunStatus> => {
        if (runningCode) return "ignored";

        if (!code.trim()) {
            setRunOutput("No hay código en el editor.");
            return "ignored";
        }

        setRunningCode(true);
        setRunOutput("Ejecutando...");

        try {
            if (language === "python") {
                const result = await runPythonCode(code);
                const blocks: string[] = [];

                if (result.stdout.trim()) {
                    blocks.push(result.stdout.trim());
                }

                const hasError = result.exitCode !== 0 || Boolean(result.spawnError) || result.timedOut;

                if (result.stderr.trim()) {
                    blocks.push(result.stderr.trim());
                }

                if (result.spawnError) {
                    blocks.push(`Error al lanzar Python: ${result.spawnError}`);
                }

                if (result.timedOut) {
                    blocks.push("Tiempo de ejecución agotado.");
                }

                if (result.outputTruncated) {
                    blocks.push("(salida truncada por limite de tamaño)");
                }

                if (blocks.length === 0) {
                    blocks.push("Sin salida.");
                }

                setRunOutput(blocks.join("\n\n"));
                return hasError ? "error" : "success";
            }

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
            const message = error instanceof Error ? error.message : "Error desconocido al ejecutar código.";
            setRunOutput(`Error: ${message}`);
            return "error";
        } finally {
            setRunningCode(false);
        }
    }, [runningCode, language]);

    return { runningCode, runOutput, runCode };
}
