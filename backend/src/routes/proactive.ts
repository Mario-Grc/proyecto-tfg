import { Router } from "express";
import { parseRequest } from "../middleware/validation";
import { proactiveRequestSchema } from "../schemas/proactive";
import { ProactiveService } from "../services/proactive-service";

export const proactiveRouter = Router();

const proactiveService = new ProactiveService();

proactiveRouter.post("/", async (req, res, next) => {
  // si el cliente se desconecta o escribe, cortar la generacion del LLM
  const abortController = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  try {
    const body = parseRequest(proactiveRequestSchema, req.body, "Body de proactive invalido");
    const result = await proactiveService.generateIntervention(body, abortController.signal);
    res.json(result);
  } catch (error) {
    if (abortController.signal.aborted) {
      return;
    }

    next(error);
  }
});
