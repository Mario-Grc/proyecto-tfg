import { createDatabaseConnection } from "./connection";

let initialized = false;

export function initializeDatabase(): void {
  if (initialized) {
    return;
  }

  const db = createDatabaseConnection();
  db.close();

  initialized = true;
}
