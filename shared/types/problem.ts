export type ProblemDifficulty = "Facil" | "Media" | "Dificil";
export type ProblemSource = "seed" | "user";

export interface CreateProblemInput {
  title: string;
  difficulty: ProblemDifficulty;
  topic: string;
  statement: string;
}

export interface ProblemRecord {
  id: string;
  title: string;
  difficulty: ProblemDifficulty;
  topic: string;
  statement: string;
  source: ProblemSource;
  createdAt?: string;
  updatedAt?: string;
}
