import "server-only";

import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, type Profile } from "./profile";
import type { UserRole } from "./session";

/** For server components: redirect to login when signed out. */
export async function requireProfile(loginPath = "/login", next?: string): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(next ? `${loginPath}?next=${encodeURIComponent(next)}` : loginPath);
  return profile;
}

export async function requireRole(roles: UserRole[], loginPath: string, next?: string): Promise<Profile> {
  const profile = await requireProfile(loginPath, next);
  if (!roles.includes(profile.role)) redirect("/");
  return profile;
}

/** For server actions / route handlers: throw instead of redirecting. */
export async function assertProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new AppError("UNAUTHORIZED");
  if (!profile.is_active) throw new AppError("FORBIDDEN", "Your account has been deactivated.");
  return profile;
}

export async function assertRole(...roles: UserRole[]): Promise<Profile> {
  const profile = await assertProfile();
  if (!roles.includes(profile.role)) throw new AppError("FORBIDDEN");
  return profile;
}

/** The owner's shop (owners manage exactly one shop in the MVP). */
export async function getOwnedShop() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("shops")
    .select("*")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
