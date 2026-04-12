import { z } from "zod";

export const chatRequestSchema = z.object({
  sessionId: z.string().min(1),
  problemId: z.string().min(1).optional(),
  text: z.string().trim().min(1),
  selectedCode: z.string().optional(),
});

export const chatUsageSchema = z.object({
  prompt_tokens: z.number().int().nonnegative(),
  completion_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
});

export const chatResponseSchema = z.object({
  sessionId: z.string().min(1),
  assistantText: z.string(),
  usage: chatUsageSchema.optional(),
});
