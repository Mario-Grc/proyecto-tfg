import { Router } from "express";
import { chatRouter } from "./chat";
import { healthRouter } from "./health";
import { problemsRouter } from "./problems";
import { runRouter } from "./run";
import { sessionsRouter } from "./sessions";

export function buildApiRouter(): Router {
  const router = Router();

  router.use("/health", healthRouter);
  router.use("/chat", chatRouter);
  router.use("/problems", problemsRouter);
  router.use("/sessions", sessionsRouter);
  router.use("/run", runRouter);

  return router;
}
