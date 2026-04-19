import { z } from "zod";

export const messageRoleSchema = z.enum(["system", "user", "assistant", "tool"]);

export const messageRecordSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  role: messageRoleSchema,
  content: z.string(),
  usagePromptTokens: z.number().int().nonnegative().nullable().optional(),
  usageCompletionTokens: z.number().int().nonnegative().nullable().optional(),
  usageTotalTokens: z.number().int().nonnegative().nullable().optional(),
  createdAt: z.string().min(1),
});

export const createMessageBodySchema = z.object({
  role: messageRoleSchema,
  content: z.string().min(1),
  usagePromptTokens: z.number().int().nonnegative().nullable().optional(),
  usageCompletionTokens: z.number().int().nonnegative().nullable().optional(),
  usageTotalTokens: z.number().int().nonnegative().nullable().optional(),
});

export const messageListResponseSchema = z.array(messageRecordSchema);
