import { z } from "zod";

export const problemDifficultySchema = z.enum(["Facil", "Media", "Dificil"]);
export const problemSourceSchema = z.enum(["seed", "user"]);

export const problemRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  difficulty: problemDifficultySchema,
  topic: z.string().min(1),
  statement: z.string().min(1),
  source: problemSourceSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const problemIdParamsSchema = z.object({
  problemId: z.string().min(1),
});

export const createProblemBodySchema = z.object({
  title: z.string().min(1),
  difficulty: problemDifficultySchema,
  topic: z.string().min(1),
  statement: z.string().min(1),
});

export const problemListResponseSchema = z.array(problemRecordSchema);
