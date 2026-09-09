import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export interface SessionInfo {
  response: NextResponse;
  userId: string | null;
  role: Database["public"]["Enums"]["user_role"] | null;
}

/**
 * Refreshes the Supabase session cookie on every request and returns the
 * caller's id/role (role is read from the JWT app_metadata mirror, which is
 * kept in sync by a database trigger; RLS re-checks it on every query).
 */
export async function refreshSession(request: NextRequest): Promise<SessionInfo> {
  const env = publicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims() validates the JWT locally (no network round-trip in most cases).
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  const appMeta = claims?.app_metadata as { role?: string } | undefined;
  const role = isRole(appMeta?.role) ? appMeta.role : null;

  return { response, userId, role };
}

function isRole(v: unknown): v is Database["public"]["Enums"]["user_role"] {
  return v === "customer" || v === "shop_owner" || v === "admin";
}
