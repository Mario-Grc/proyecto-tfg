export type ProblemDifficulty = "Facil" | "Media" | "Dificil";

export interface ProblemRecord {
  id: string;
  title: string;
  difficulty: ProblemDifficulty;
  topic: string;
  statement: string;
  createdAt?: string;
  updatedAt?: string;
}
