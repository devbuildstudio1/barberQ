/**
 * Canonical application error codes. The database functions raise errors using
 * these codes as the message prefix (e.g. `ALREADY_IN_QUEUE`), and the server
 * layer maps them to user-facing messages and HTTP status codes.
 */
export const ERROR_CODES = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "QUEUE_CLOSED",
  "QUEUE_PAUSED",
  "SHOP_CLOSED",
  "SHOP_NOT_APPROVED",
  "ALREADY_IN_QUEUE",
  "INVALID_QUEUE_STATE",
  "TOKEN_GENERATION_FAILED",
  "SERVICE_UNAVAILABLE",
  "BARBER_UNAVAILABLE",
  "REVIEW_NOT_ALLOWED",
  "RATE_LIMITED",
  "CONFLICT",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHORIZED: "Please sign in to continue.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "We couldn't find what you were looking for.",
  VALIDATION_ERROR: "Some details look incorrect. Please check and try again.",
  QUEUE_CLOSED: "This queue is closed right now.",
  QUEUE_PAUSED: "The queue is temporarily paused. Please try again shortly.",
  SHOP_CLOSED: "This shop is currently closed.",
  SHOP_NOT_APPROVED: "This shop is not accepting customers yet.",
  ALREADY_IN_QUEUE: "You're already in this shop's queue today.",
  INVALID_QUEUE_STATE: "That action isn't possible in the current queue state.",
  TOKEN_GENERATION_FAILED: "We couldn't generate a token. Please try again.",
  SERVICE_UNAVAILABLE: "That service isn't available right now.",
  BARBER_UNAVAILABLE: "That barber isn't available right now.",
  REVIEW_NOT_ALLOWED: "You can review a shop after a completed visit.",
  RATE_LIMITED: "Too many requests. Please slow down.",
  CONFLICT: "Someone else changed this just now. Please refresh.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
};

export const ERROR_STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  QUEUE_CLOSED: 409,
  QUEUE_PAUSED: 409,
  SHOP_CLOSED: 409,
  SHOP_NOT_APPROVED: 409,
  ALREADY_IN_QUEUE: 409,
  INVALID_QUEUE_STATE: 409,
  TOKEN_GENERATION_FAILED: 500,
  SERVICE_UNAVAILABLE: 409,
  BARBER_UNAVAILABLE: 409,
  REVIEW_NOT_ALLOWED: 403,
  RATE_LIMITED: 429,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message?: string, details?: unknown) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.details = details;
  }

  toJSON() {
    return { error: { code: this.code, message: this.message, details: this.details } };
  }
}

export function isErrorCode(value: string): value is ErrorCode {
  return (ERROR_CODES as readonly string[]).includes(value);
}

/**
 * Convert an unknown thrown value (Postgres error, fetch error, Zod error...)
 * into an AppError without leaking raw database messages.
 */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  const message = extractMessage(err);
  // Database functions raise `RAISE EXCEPTION 'ALREADY_IN_QUEUE'` (optionally with ": detail").
  const codeMatch = message.match(/^([A-Z_]{4,})(?::\s*(.*))?$/);
  if (codeMatch && isErrorCode(codeMatch[1])) {
    return new AppError(codeMatch[1], undefined, codeMatch[2] || undefined);
  }

  const pgCode = extractPgCode(err);
  switch (pgCode) {
    case "23505": // unique_violation
      return new AppError("CONFLICT");
    case "23503": // foreign_key_violation
    case "23514": // check_violation
    case "22P02": // invalid_text_representation
      return new AppError("VALIDATION_ERROR");
    case "42501": // insufficient_privilege (RLS)
      return new AppError("FORBIDDEN");
    case "PGRST116": // PostgREST: no rows for .single()
      return new AppError("NOT_FOUND");
    case "PGRST301": // JWT expired
      return new AppError("UNAUTHORIZED");
    default:
      return new AppError("INTERNAL_ERROR");
  }
}

function extractMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return "";
}

function extractPgCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err && typeof err.code === "string") {
    return err.code;
  }
  return undefined;
}

/** A discriminated result type used by server actions so the client never sees thrown errors. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string; fieldErrors?: Record<string, string[]> } };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(
  err: unknown,
  fieldErrors?: Record<string, string[]>,
): ActionResult<T> {
  const appErr = toAppError(err);
  return { ok: false, error: { code: appErr.code, message: appErr.message, fieldErrors } };
}
