import { z } from "zod";

export const sessionRecordSchema = z.object({
  id: z.string().min(1),
  problemId: z.string().min(1),
  editorCode: z.string().nullable().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const sessionIdParamsSchema = z.object({
  sessionId: z.string().min(1),
});

export const latestSessionByProblemParamsSchema = z.object({
  problemId: z.string().min(1),
});

export const createSessionBodySchema = z.object({
  problemId: z.string().min(1),
});

export const latestSessionResponseSchema = sessionRecordSchema.nullable();

export const updateSessionCodeBodySchema = z.object({
  editorCode: z.string().nullable(),
});
