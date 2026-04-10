import { createApp } from "./app";
import { config } from "./config";

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`[backend] listening on http://localhost:${config.port}`);
});

function shutdown(signal: NodeJS.Signals) {
  console.log(`[backend] received ${signal}, shutting down`);
  server.close((error) => {
    if (error) {
      console.error("[backend] error while closing server", error);
      process.exit(1);
    }

    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
