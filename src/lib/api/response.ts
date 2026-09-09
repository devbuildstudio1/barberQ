import "server-only";

import { NextResponse } from "next/server";
import { toAppError } from "@/lib/errors";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function jsonError(err: unknown) {
  const appErr = toAppError(err);
  if (appErr.code === "INTERNAL_ERROR") console.error("[api]", err);
  return NextResponse.json(appErr.toJSON(), { status: appErr.status });
}

type RouteContext = { params: Promise<Record<string, string>> };

/** Wrap a route handler so any thrown error becomes a clean JSON error. */
export function handle(fn: (req: Request, ctx: RouteContext) => Promise<Response>) {
  return async (req: Request, ctx: RouteContext) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      return jsonError(err);
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
