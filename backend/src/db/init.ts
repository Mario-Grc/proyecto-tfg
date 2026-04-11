import { getDatabase } from "./connection";
import { runMigrations } from "./migrate";
import { seedProblems } from "./seeds/problems";

let initialized = false;

export function initializeDatabase(): void {
  if (initialized) {
    return;
  }

  const db = getDatabase();
  const appliedMigrations = runMigrations(db);
  const seededProblems = seedProblems(db);

  if (appliedMigrations > 0) {
    console.log(`[backend] applied migrations: ${appliedMigrations}`);
  }

  console.log(`[backend] ensured problem seed: ${seededProblems} records`);

  initialized = true;
}
