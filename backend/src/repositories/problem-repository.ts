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
  functionName: string | null;
  testCases: string | null;
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
  function_name: string | null;
  test_cases: string | null;
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
    functionName: row.function_name,
    testCases: row.test_cases,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type UserProblemInput = Pick<
  ProblemEntity,
  "title" | "difficulty" | "topic" | "statement" | "functionName" | "testCases"
>;

export class ProblemRepository {
  private readonly db = getDatabase();

  private buildSelectAllStmt() {
    return this.db.prepare(`
      SELECT id, title, difficulty, topic, statement, source,
             function_name, test_cases,
             created_at, updated_at
      FROM problems
      ORDER BY created_at DESC
    `);
  }

  private buildSelectByIdStmt() {
    return this.db.prepare(`
      SELECT id, title, difficulty, topic, statement, source,
             function_name, test_cases,
             created_at, updated_at
      FROM problems
      WHERE id = ?
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

  updateById(problemId: string, input: UserProblemInput): ProblemEntity | null {
    this.db.prepare(`
      UPDATE problems
      SET title = @title, difficulty = @difficulty, topic = @topic,
          statement = @statement,
          function_name = @function_name,
          test_cases = @test_cases,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run({
      id: problemId,
      title: input.title,
      difficulty: input.difficulty,
      topic: input.topic,
      statement: input.statement,
      function_name: input.functionName,
      test_cases: input.testCases,
    });

    return this.findById(problemId);
  }

  deleteById(problemId: string): void {
    this.db.transaction(() => {
      this.db.prepare("DELETE FROM sessions WHERE problem_id = ?").run(problemId);
      this.db.prepare("DELETE FROM problems WHERE id = ?").run(problemId);
    })();
  }

  createUser(input: UserProblemInput): ProblemEntity {
    const id = createId();
    this.db.prepare(`
      INSERT INTO problems (id, title, difficulty, topic, statement, source,
                            function_name, test_cases,
                            created_at, updated_at)
      VALUES (@id, @title, @difficulty, @topic, @statement, 'user',
              @function_name, @test_cases,
              CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run({
      id,
      title: input.title,
      difficulty: input.difficulty,
      topic: input.topic,
      statement: input.statement,
      function_name: input.functionName,
      test_cases: input.testCases,
    });

    const saved = this.findById(id);

    if (!saved) {
      throw new Error(`No se pudo persistir el problema ${id}`);
    }

    return saved;
  }
}
