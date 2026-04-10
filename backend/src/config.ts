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

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  llmApiEndpoint: process.env.LLM_API_ENDPOINT ?? "http://127.0.0.1:1234/v1/chat/completions",
  llmModelName: process.env.LLM_MODEL_NAME ?? "local-model",
  dataDir: path.resolve(process.cwd(), process.env.DATA_DIR ?? "data"),
  dbFileName: process.env.DB_FILE_NAME ?? "quackcode.db",
};
