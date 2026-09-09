import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type UserRole = Database["public"]["Enums"]["user_role"];

export interface SessionUser {
  id: string;
  role: UserRole;
  email: string | null;
  phone: string | null;
}

/**
 * Current session user from validated JWT claims (cached per request).
 * Returns null when signed out. Profile details come from `getCurrentProfile()`.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims || typeof claims.sub !== "string") return null;
  const meta = (claims.app_metadata ?? {}) as { role?: string };
  const role: UserRole = meta.role === "admin" || meta.role === "shop_owner" ? meta.role : "customer";
  return {
    id: claims.sub,
    role,
    email: typeof claims.email === "string" ? claims.email : null,
    phone: typeof claims.phone === "string" ? claims.phone : null,
  };
});
