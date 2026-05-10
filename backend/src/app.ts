import cors from "cors";
import express from "express";
import { config } from "./config";
import { initializeDatabase } from "./db/init";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";

export function createApp() {
  initializeDatabase();
  const { buildApiRouter } = require("./routes") as typeof import("./routes");

  const app = express();

  app.disable("x-powered-by");
  app.use(cors({ origin: config.frontendOrigin }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  app.use("/api", buildApiRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
