import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "../config";

let dbInstance: Database.Database | null = null;

function createDatabaseConnection(): Database.Database {
  fs.mkdirSync(config.dataDir, { recursive: true });

  const dbPath = path.join(config.dataDir, config.dbFileName);
  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  return db;
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    dbInstance = createDatabaseConnection();
  }

  return dbInstance;
}

export function closeDatabase(): void {
  if (!dbInstance) {
    return;
  }

  dbInstance.close();
  dbInstance = null;
}
