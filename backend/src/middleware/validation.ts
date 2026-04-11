import { z } from "zod";
import { HttpError } from "./error-handler";

export function parseRequest<T>(schema: z.ZodType<T>, value: unknown, message = "Peticion invalida"): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new HttpError(400, message, result.error.issues);
  }

  return result.data;
}
