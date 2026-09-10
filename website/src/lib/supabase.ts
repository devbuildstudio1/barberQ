import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Read-only Supabase access for the marketing site.
 *
 * The site is anonymous by design: no sign-in, no cookies, no session. It reads
 * only what Row Level Security already exposes to the public (approved shops and
 * coarse platform aggregates) using the anon key, on the server, at build and
 * revalidation time.
 *
 * Everything here is optional. If Supabase is unconfigured or unreachable the
 * callers fall back to static copy, so a database outage cannot take the
 * marketing site down.
 */
let client: SupabaseClient | null | undefined;

export function supabase(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    client = null;
    return client;
  }

  client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "queuecut-website" } },
  });
  return client;
}

/** Give a slow or unreachable database a hard deadline; marketing pages must render regardless. */
export async function withTimeout<T>(promise: PromiseLike<T>, ms = 4000): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
