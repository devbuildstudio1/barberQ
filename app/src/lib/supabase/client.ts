"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

let browserClient: SupabaseClient<Database> | undefined;

/** Singleton browser client (anon key + user session cookie). RLS applies. */
export function createClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;
  const env = publicEnv();
  browserClient = createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (process.env.NODE_ENV !== "production") {
    // Debug handle for inspecting realtime state from the console in development.
    (window as unknown as { __supabase?: SupabaseClient<Database> }).__supabase = browserClient;
  }
  return browserClient;
}
