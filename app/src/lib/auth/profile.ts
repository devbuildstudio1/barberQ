import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { getSessionUser } from "./session";

export type Profile = Tables<"users">;

/** Current user's profile row (RLS-scoped), cached per request. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const session = await getSessionUser();
  if (!session) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("users").select("*").eq("id", session.id).maybeSingle();
  return data ?? null;
});
