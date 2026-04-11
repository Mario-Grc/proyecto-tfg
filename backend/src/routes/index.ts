import { Router } from "express";
import { healthRouter } from "./health";
import { problemsRouter } from "./problems";
import { sessionsRouter } from "./sessions";

export function buildApiRouter(): Router {
  const router = Router();

  router.use("/health", healthRouter);
  router.use("/problems", problemsRouter);
  router.use("/sessions", sessionsRouter);

  return router;
}
