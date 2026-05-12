import { Router } from "express";
import { config } from "../config";
import { parseRequest } from "../middleware/validation";
import { runPythonRequestSchema } from "../schemas/run";
import { runPythonCode } from "../tools/code-runner";

export const runRouter = Router();

runRouter.post("/python", async (req, res) => {
  const body = parseRequest(runPythonRequestSchema, req.body, "Body de ejecucion invalido");

  const normalizedCode = body.code.trim();

  if (normalizedCode.length > config.codeRunnerMaxCodeChars) {
    res.status(400).json({ error: `El codigo supera el limite permitido (${config.codeRunnerMaxCodeChars} caracteres).` });
    return;
  }

  const result = await runPythonCode(normalizedCode, {
    timeoutMs: config.codeRunnerTimeoutMs,
  });

  res.json(result);
});
