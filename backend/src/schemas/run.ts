import { z } from "zod";

export const runPythonRequestSchema = z.object({
  code: z.string().min(1),
});
