import { z } from "zod";

export const chatRequestSchema = z.object({
  sessionId: z.string().min(1),
  text: z.string().trim().min(1),
  selectedCode: z.string().optional(),
});

export const chatUsageSchema = z.object({
  prompt_tokens: z.number().int().nonnegative(),
  completion_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
});

export const chatStreamDeltaEventSchema = z.object({
  type: z.literal("delta"),
  delta: z.string(),
});

export const chatStreamToolStartEventSchema = z.object({
  type: z.literal("tool_start"),
  toolName: z.string().min(1),
});

export const chatStreamToolResultEventSchema = z.object({
  type: z.literal("tool_result"),
  toolName: z.string().min(1),
  result: z.string(),
});

export const chatStreamDoneEventSchema = z.object({
  type: z.literal("done"),
  sessionId: z.string().min(1),
  assistantText: z.string(),
  usage: chatUsageSchema.optional(),
});

export const chatStreamErrorEventSchema = z.object({
  type: z.literal("error"),
  error: z.string().min(1),
});

export const chatStreamEventSchema = z.discriminatedUnion("type", [
  chatStreamDeltaEventSchema,
  chatStreamToolStartEventSchema,
  chatStreamToolResultEventSchema,
  chatStreamDoneEventSchema,
  chatStreamErrorEventSchema,
]);
