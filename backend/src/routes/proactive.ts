import { Router } from "express";
import { parseRequest } from "../middleware/validation";
import { proactiveRequestSchema } from "../schemas/proactive";
import { ProactiveService } from "../services/proactive-service";

export const proactiveRouter = Router();

const proactiveService = new ProactiveService();

proactiveRouter.post("/", async (req, res, next) => {
  try {
    const body = parseRequest(proactiveRequestSchema, req.body, "Body de proactive invalido");
    const result = await proactiveService.generateIntervention(body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
