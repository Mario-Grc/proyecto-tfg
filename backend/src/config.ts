import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

function parsePort(rawPort: string | undefined): number {
  const parsed = Number(rawPort);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    return 3001;
  }

  return parsed;
}

function parsePositiveInt(rawValue: string | undefined, defaultValue: number): number {
  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return defaultValue;
  }

  return parsed;
}

function parseBoolean(rawValue: string | undefined, defaultValue: boolean): boolean {
  if (rawValue === undefined) {
    return defaultValue;
  }

  const normalized = rawValue.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

function parseOptionalString(rawValue: string | undefined): string | null {
  const trimmed = rawValue?.trim();
  return trimmed ? trimmed : null;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  llmApiEndpoint: process.env.LLM_API_ENDPOINT ?? "http://127.0.0.1:1234/v1/chat/completions",
  llmModelName: process.env.LLM_MODEL_NAME ?? "local-model",
  enableToolCalling: parseBoolean(process.env.ENABLE_TOOL_CALLING, true),
  toolCallMaxRounds: parsePositiveInt(process.env.TOOL_CALL_MAX_ROUNDS, 3),
  codeRunnerTimeoutMs: parsePositiveInt(process.env.CODE_RUNNER_TIMEOUT_MS, 5000),
  codeRunnerMaxCodeChars: parsePositiveInt(process.env.CODE_RUNNER_MAX_CODE_CHARS, 12000),
  enableMcpWebSearch: parseBoolean(process.env.ENABLE_MCP_WEB_SEARCH, false),
  mcpWebSearchTimeoutMs: parsePositiveInt(process.env.MCP_WEB_SEARCH_TIMEOUT_MS, 15000),
  tavilyMcpEndpoint: process.env.TAVILY_MCP_ENDPOINT ?? "https://mcp.tavily.com/mcp",
  tavilyMcpToolName: process.env.TAVILY_MCP_TOOL_NAME ?? "tavily-search",
  tavilyApiKey: parseOptionalString(process.env.TAVILY_API_KEY),
  dataDir: path.resolve(process.cwd(), process.env.DATA_DIR ?? "data"),
  dbFileName: process.env.DB_FILE_NAME ?? "quackcode.db",
};
