import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

const MIGRATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
`;

interface AppliedMigrationRow {
  version: string;
}

function resolveMigrationsDir(): string {
  const runtimeDir = path.resolve(__dirname, "migrations");
  if (fs.existsSync(runtimeDir)) {
    return runtimeDir;
  }

  return path.resolve(__dirname, "../../src/db/migrations");
}

function listMigrationFiles(migrationsDir: string): string[] {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));
}

export function runMigrations(db: Database.Database): number {
  db.exec(MIGRATIONS_TABLE_SQL);

  const migrationsDir = resolveMigrationsDir();
  const migrationFiles = listMigrationFiles(migrationsDir);

  if (migrationFiles.length === 0) {
    return 0;
  }

  const selectAppliedStmt = db.prepare("SELECT version FROM schema_migrations");
  const insertAppliedStmt = db.prepare("INSERT INTO schema_migrations (version) VALUES (?)");

  const applied = new Set<string>(
    (selectAppliedStmt.all() as AppliedMigrationRow[]).map((row) => row.version)
  );

  const applyMigration = db.transaction((version: string, sqlText: string) => {
    db.exec(sqlText);
    insertAppliedStmt.run(version);
  });

  let appliedCount = 0;

  for (const fileName of migrationFiles) {
    const version = fileName.replace(/\.sql$/i, "");

    if (applied.has(version)) {
      continue;
    }

    const sqlText = fs.readFileSync(path.join(migrationsDir, fileName), "utf8");
    applyMigration(version, sqlText);
    appliedCount += 1;
  }

  return appliedCount;
}
