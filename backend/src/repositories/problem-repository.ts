import { getDatabase } from "../db/connection";
import { createId } from "../utils/id";

export type ProblemDifficulty = "Facil" | "Media" | "Dificil";
export type ProblemSource = "seed" | "user";

export interface ProblemEntity {
  id: string;
  title: string;
  difficulty: ProblemDifficulty;
  topic: string;
  statement: string;
  source: ProblemSource;
  createdAt: string;
  updatedAt: string;
}

type ProblemRow = {
  id: string;
  title: string;
  difficulty: ProblemDifficulty;
  topic: string;
  statement: string;
  source: ProblemSource;
  created_at: string;
  updated_at: string;
};

function mapProblemRow(row: ProblemRow): ProblemEntity {
  return {
    id: row.id,
    title: row.title,
    difficulty: row.difficulty,
    topic: row.topic,
    statement: row.statement,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProblemRepository {
  private readonly db = getDatabase();

  private buildSelectAllStmt() {
    return this.db.prepare(`
      SELECT id, title, difficulty, topic, statement, source, created_at, updated_at
      FROM problems
      ORDER BY created_at DESC
    `);
  }

  private buildSelectByIdStmt() {
    return this.db.prepare(`
      SELECT id, title, difficulty, topic, statement, source, created_at, updated_at
      FROM problems
      WHERE id = ?
    `);
  }

  private buildUpsertStmt() {
    return this.db.prepare(`
      INSERT INTO problems (id, title, difficulty, topic, statement, source, created_at, updated_at)
      VALUES (@id, @title, @difficulty, @topic, @statement, @source, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        difficulty = excluded.difficulty,
        topic = excluded.topic,
        statement = excluded.statement,
        source = excluded.source,
        updated_at = CURRENT_TIMESTAMP
    `);
  }

  private buildInsertUserStmt() {
    return this.db.prepare(`
      INSERT INTO problems (id, title, difficulty, topic, statement, source, created_at, updated_at)
      VALUES (@id, @title, @difficulty, @topic, @statement, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
  }

  listAll(): ProblemEntity[] {
    const rows = this.buildSelectAllStmt().all() as ProblemRow[];
    return rows.map(mapProblemRow);
  }

  findById(problemId: string): ProblemEntity | null {
    const row = this.buildSelectByIdStmt().get(problemId) as ProblemRow | undefined;
    return row ? mapProblemRow(row) : null;
  }

  upsert(input: Pick<ProblemEntity, "id" | "title" | "difficulty" | "topic" | "statement" | "source">): ProblemEntity {
    this.buildUpsertStmt().run(input);
    const saved = this.findById(input.id);

    if (!saved) {
      throw new Error(`No se pudo persistir el problema ${input.id}`);
    }

    return saved;
  }

  createUser(input: Pick<ProblemEntity, "title" | "difficulty" | "topic" | "statement">): ProblemEntity {
    const id = createId();
    this.buildInsertUserStmt().run({
      id,
      title: input.title,
      difficulty: input.difficulty,
      topic: input.topic,
      statement: input.statement,
    });

    const saved = this.findById(id);

    if (!saved) {
      throw new Error(`No se pudo persistir el problema ${id}`);
    }

    return saved;
  }
}
