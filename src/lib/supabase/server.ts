import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Request-scoped server client bound to the caller's session cookies.
 * Use in Server Components, Route Handlers and Server Actions. RLS applies.
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const env = publicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are refreshed by the proxy instead.
        }
      },
    },
  });
}

// There is deliberately no service-role client here. Every runtime query runs
// as the signed-in user so Row Level Security is always in force; privileged
// work (seeding, tests, maintenance) uses the Supabase CLI or a standalone
// script instead. Keep it that way: an RLS bypass in request code is one
// missing ownership check away from a data leak.
