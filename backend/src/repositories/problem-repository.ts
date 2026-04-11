import { getDatabase } from "../db/connection";

export type ProblemDifficulty = "Facil" | "Media" | "Dificil";

export interface ProblemEntity {
  id: string;
  title: string;
  difficulty: ProblemDifficulty;
  topic: string;
  statement: string;
  createdAt: string;
  updatedAt: string;
}

type ProblemRow = {
  id: string;
  title: string;
  difficulty: ProblemDifficulty;
  topic: string;
  statement: string;
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProblemRepository {
  private readonly db = getDatabase();

  private readonly selectAllStmt = this.db.prepare(`
    SELECT id, title, difficulty, topic, statement, created_at, updated_at
    FROM problems
    ORDER BY created_at DESC
  `);

  private readonly selectByIdStmt = this.db.prepare(`
    SELECT id, title, difficulty, topic, statement, created_at, updated_at
    FROM problems
    WHERE id = ?
  `);

  private readonly upsertStmt = this.db.prepare(`
    INSERT INTO problems (id, title, difficulty, topic, statement, created_at, updated_at)
    VALUES (@id, @title, @difficulty, @topic, @statement, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      difficulty = excluded.difficulty,
      topic = excluded.topic,
      statement = excluded.statement,
      updated_at = CURRENT_TIMESTAMP
  `);

  listAll(): ProblemEntity[] {
    const rows = this.selectAllStmt.all() as ProblemRow[];
    return rows.map(mapProblemRow);
  }

  findById(problemId: string): ProblemEntity | null {
    const row = this.selectByIdStmt.get(problemId) as ProblemRow | undefined;
    return row ? mapProblemRow(row) : null;
  }

  upsert(input: Pick<ProblemEntity, "id" | "title" | "difficulty" | "topic" | "statement">): ProblemEntity {
    this.upsertStmt.run(input);
    const saved = this.findById(input.id);

    if (!saved) {
      throw new Error(`No se pudo persistir el problema ${input.id}`);
    }

    return saved;
  }
}
