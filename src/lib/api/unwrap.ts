import "server-only";

import { AppError, type ActionResult } from "@/lib/errors";

/** Convert an ActionResult into a value or throw an AppError (for route handlers). */
export function unwrap<T>(result: ActionResult<T>): T {
  if (result.ok) return result.data;
  throw new AppError(result.error.code, result.error.message, result.error.fieldErrors);
}
