export type ProblemDifficulty = "Facil" | "Media" | "Dificil";
export type ProblemSource = "seed" | "user";

export interface CreateProblemInput {
  title: string;
  difficulty: ProblemDifficulty;
  topic: string;
  statement: string;
  functionName: string | null;
  testCases: string | null;
}

export type UpdateProblemInput = CreateProblemInput;

export interface ProblemRecord {
  id: string;
  title: string;
  difficulty: ProblemDifficulty;
  topic: string;
  statement: string;
  source: ProblemSource;
  functionName: string | null;
  testCases: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestCase {
  input: unknown[];
  expected: unknown;
}

export interface TestResult {
  index: number;
  ok: boolean;
  input: unknown[];
  expected: unknown;
  actual?: unknown;
  error?: string;
}

export interface CheckResult {
  tests: TestResult[];
  harnessError?: string;
  allPassed: boolean;
}
