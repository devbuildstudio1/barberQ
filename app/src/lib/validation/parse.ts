import type { z } from "zod";
import { AppError } from "@/lib/errors";

/** Parse with Zod and convert failures into a VALIDATION_ERROR carrying field errors. */
export function parseOrThrow<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  const first = result.error.issues[0]?.message;
  throw new AppError("VALIDATION_ERROR", first, fieldErrors);
}

export function fieldErrorsOf(err: unknown): Record<string, string[]> | undefined {
  if (err instanceof AppError && err.code === "VALIDATION_ERROR" && err.details && typeof err.details === "object") {
    return err.details as Record<string, string[]>;
  }
  return undefined;
}
