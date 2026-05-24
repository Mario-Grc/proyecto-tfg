import { z } from "zod";

const proactiveFailingTestSchema = z.object({
  input: z.array(z.unknown()),
  expected: z.unknown(),
  actual: z.unknown().optional(),
  error: z.string().optional(),
});

const proactiveTestSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failing: z.array(proactiveFailingTestSchema),
});

export const proactiveRequestSchema = z.object({
  sessionId: z.string().min(1),
  trigger: z.enum(["test_failure", "idle"]),
  language: z.enum(["javascript", "python"]).optional(),
  responseLanguage: z.enum(["es", "en"]).optional(),
  editorCode: z.string().optional(),
  testSummary: proactiveTestSummarySchema.optional(),
});
