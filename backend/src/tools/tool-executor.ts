import { config } from "../config";
import { runJavaScriptCode, runPythonCode, type SubprocessRunResult } from "./code-runner";
import { TavilyMcpClient } from "./tavily-mcp-client";
import {
  TOOL_NAME_EXECUTE_CODE,
  TOOL_NAME_EXECUTE_PYTHON,
  TOOL_NAME_SEARCH_WEB,
} from "./tool-registry";

export interface ToolExecutionOutcome {
  toolName: string;
  ok: boolean;
  output: string;
}

interface ExecuteCodeArgs {
  code: string;
}

interface SearchWebArgs {
  query: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function parseExecuteCodeArgs(rawArgs: unknown): ExecuteCodeArgs | null {
  const args = asRecord(rawArgs);
  if (!args || typeof args.code !== "string") {
    return null;
  }

  return { code: args.code };
}

function parseSearchWebArgs(rawArgs: unknown): SearchWebArgs | null {
  const args = asRecord(rawArgs);
  if (!args || typeof args.query !== "string") {
    return null;
  }

  return { query: args.query };
}

function buildSubprocessOutput(result: SubprocessRunResult, timeoutMs: number): string {
  const blocks: string[] = [];

  if (result.stdout.trim()) {
    blocks.push(`stdout:\n${result.stdout.trim()}`);
  }

  if (result.stderr.trim()) {
    blocks.push(`stderr:\n${result.stderr.trim()}`);
  }

  if (result.spawnError) {
    blocks.push(`spawn_error: ${result.spawnError}`);
  }

  if (result.timedOut) {
    blocks.push(`timeout: se supero el limite de ${timeoutMs}ms`);
  }

  if (result.outputTruncated) {
    blocks.push("output_truncated: la salida fue truncada por limite de tamano");
  }

  blocks.push(`exit_code: ${result.exitCode ?? "null"}`);
  blocks.push(`duration_ms: ${result.durationMs}`);

  if (blocks.length === 2) {
    blocks.unshift("Sin salida en consola.");
  }

  return blocks.join("\n\n");
}

export class ToolExecutor {
  private readonly tavilyMcpClient = new TavilyMcpClient();

  async execute(toolName: string, rawArgs: unknown): Promise<ToolExecutionOutcome> {
    if (toolName === TOOL_NAME_EXECUTE_CODE) {
      return this.executeCode(rawArgs);
    }

    if (toolName === TOOL_NAME_EXECUTE_PYTHON) {
      return this.executePython(rawArgs);
    }

    if (toolName === TOOL_NAME_SEARCH_WEB) {
      return this.searchWeb(rawArgs);
    }

    return {
      toolName,
      ok: false,
      output: `Herramienta no soportada: ${toolName}`,
    };
  }

  private async executeCode(rawArgs: unknown): Promise<ToolExecutionOutcome> {
    const parsedArgs = parseExecuteCodeArgs(rawArgs);

    if (!parsedArgs) {
      return {
        toolName: TOOL_NAME_EXECUTE_CODE,
        ok: false,
        output: "Argumentos invalidos para ejecutar_codigo.",
      };
    }

    const normalizedCode = parsedArgs.code.trim();

    if (!normalizedCode) {
      return {
        toolName: TOOL_NAME_EXECUTE_CODE,
        ok: false,
        output: "No se recibio codigo para ejecutar.",
      };
    }

    if (normalizedCode.length > config.codeRunnerMaxCodeChars) {
      return {
        toolName: TOOL_NAME_EXECUTE_CODE,
        ok: false,
        output: `El codigo supera el limite permitido (${config.codeRunnerMaxCodeChars} caracteres).`,
      };
    }

    const runResult = await runJavaScriptCode(normalizedCode, {
      timeoutMs: config.codeRunnerTimeoutMs,
    });

    const isSuccess = !runResult.timedOut && !runResult.spawnError && runResult.exitCode === 0;

    return {
      toolName: TOOL_NAME_EXECUTE_CODE,
      ok: isSuccess,
      output: buildSubprocessOutput(runResult, config.codeRunnerTimeoutMs),
    };
  }

  private async executePython(rawArgs: unknown): Promise<ToolExecutionOutcome> {
    const parsedArgs = parseExecuteCodeArgs(rawArgs);

    if (!parsedArgs) {
      return {
        toolName: TOOL_NAME_EXECUTE_PYTHON,
        ok: false,
        output: "Argumentos invalidos para ejecutar_python.",
      };
    }

    const normalizedCode = parsedArgs.code.trim();

    if (!normalizedCode) {
      return {
        toolName: TOOL_NAME_EXECUTE_PYTHON,
        ok: false,
        output: "No se recibio codigo para ejecutar.",
      };
    }

    if (normalizedCode.length > config.codeRunnerMaxCodeChars) {
      return {
        toolName: TOOL_NAME_EXECUTE_PYTHON,
        ok: false,
        output: `El codigo supera el limite permitido (${config.codeRunnerMaxCodeChars} caracteres).`,
      };
    }

    const runResult = await runPythonCode(normalizedCode, {
      timeoutMs: config.codeRunnerTimeoutMs,
    });

    const isSuccess = !runResult.timedOut && !runResult.spawnError && runResult.exitCode === 0;

    return {
      toolName: TOOL_NAME_EXECUTE_PYTHON,
      ok: isSuccess,
      output: buildSubprocessOutput(runResult, config.codeRunnerTimeoutMs),
    };
  }

  private async searchWeb(rawArgs: unknown): Promise<ToolExecutionOutcome> {
    if (!config.enableMcpWebSearch) {
      return {
        toolName: TOOL_NAME_SEARCH_WEB,
        ok: false,
        output: "La busqueda web por MCP esta desactivada en la configuracion.",
      };
    }

    const parsedArgs = parseSearchWebArgs(rawArgs);

    if (!parsedArgs || !parsedArgs.query.trim()) {
      return {
        toolName: TOOL_NAME_SEARCH_WEB,
        ok: false,
        output: "Argumentos invalidos para buscar_web.",
      };
    }

    const searchResult = await this.tavilyMcpClient.search(parsedArgs.query);

    return {
      toolName: TOOL_NAME_SEARCH_WEB,
      ok: searchResult.ok,
      output: searchResult.output,
    };
  }
}
