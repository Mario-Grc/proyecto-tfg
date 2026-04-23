import { getDatabase } from "../db/connection";
import { createId } from "../utils/id";

export interface SessionEntity {
  id: string;
  problemId: string;
  createdAt: string;
  updatedAt: string;
}

type SessionRow = {
  id: string;
  problem_id: string;
  created_at: string;
  updated_at: string;
};

function mapSessionRow(row: SessionRow): SessionEntity {
  return {
    id: row.id,
    problemId: row.problem_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SessionRepository {
  private readonly db = getDatabase();

  private readonly insertStmt = this.db.prepare(`
    INSERT INTO sessions (id, problem_id, created_at, updated_at)
    VALUES (@id, @problemId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  private readonly selectByIdStmt = this.db.prepare(`
    SELECT id, problem_id, created_at, updated_at
    FROM sessions
    WHERE id = ?
  `);

  private readonly selectLatestByProblemStmt = this.db.prepare(`
    SELECT id, problem_id, created_at, updated_at
    FROM sessions
    WHERE problem_id = ?
    ORDER BY updated_at DESC, created_at DESC, id DESC
    LIMIT 1
  `);

  private readonly touchStmt = this.db.prepare(`
    UPDATE sessions
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  create(problemId: string): SessionEntity {
    const id = createId();
    this.insertStmt.run({ id, problemId });

    const created = this.findById(id);
    if (!created) {
      throw new Error(`No se pudo crear la sesion ${id}`);
    }

    return created;
  }

  findById(sessionId: string): SessionEntity | null {
    const row = this.selectByIdStmt.get(sessionId) as SessionRow | undefined;
    return row ? mapSessionRow(row) : null;
  }

  findLatestByProblemId(problemId: string): SessionEntity | null {
    const row = this.selectLatestByProblemStmt.get(problemId) as SessionRow | undefined;
    return row ? mapSessionRow(row) : null;
  }

  touch(sessionId: string): void {
    this.touchStmt.run(sessionId);
  }
}
