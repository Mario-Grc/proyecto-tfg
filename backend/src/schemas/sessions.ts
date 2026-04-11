import { z } from "zod";

export const sessionRecordSchema = z.object({
  id: z.string().min(1),
  problemId: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const sessionIdParamsSchema = z.object({
  sessionId: z.string().min(1),
});

export const createSessionBodySchema = z.object({
  problemId: z.string().min(1),
});
