import { Router } from "express";
import { healthRouter } from "./health";

export function buildApiRouter(): Router {
  const router = Router();

  router.use("/health", healthRouter);

  return router;
}
