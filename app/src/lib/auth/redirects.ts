import type { UserRole } from "./session";

/** Where a user lands after signing in. */
export function homeFor(role: UserRole | null | undefined): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "shop_owner") return "/shop/dashboard";
  return "/shops";
}

/** Only allow same-origin relative redirects. */
export function safeRedirectPath(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
