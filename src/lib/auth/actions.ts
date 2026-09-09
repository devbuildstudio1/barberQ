"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppError, fail, ok, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import {
  emailLoginSchema,
  ownerSignupSchema,
  phoneStartSchema,
  phoneVerifySchema,
  profileUpdateSchema,
} from "@/lib/validation/auth";
import { fieldErrorsOf, parseOrThrow } from "@/lib/validation/parse";
import { assertProfile } from "./guards";
import type { UserRole } from "./session";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

function homeFor(role: UserRole | null | undefined): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "shop_owner") return "/shop/dashboard";
  return "/shops";
}

/** Only allow same-origin relative redirects. */
export async function safeNext(next: string | null | undefined, fallback: string): Promise<string> {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

/** Step 1 of phone auth: send OTP. Creates the account on first use. */
export async function sendPhoneOtp(input: unknown): Promise<ActionResult<{ phone: string }>> {
  try {
    const { phone, name } = parseOrThrow(phoneStartSchema, input);
    const ip = await clientIp();
    if (!checkRateLimit(`otp:${ip}`, { limit: 10, windowMs: 10 * 60_000 }).ok || !checkRateLimit(`otp:${phone}`, { limit: 5, windowMs: 10 * 60_000 }).ok) {
      throw new AppError("RATE_LIMITED", "Too many code requests. Please wait a few minutes.");
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { data: name ? { name } : undefined, channel: "sms" },
    });
    if (error) {
      if (error.status === 429) throw new AppError("RATE_LIMITED", "Please wait before requesting another code.");
      if (/signups not allowed/i.test(error.message)) throw new AppError("NOT_FOUND", "No account found for this number. Please register first.");
      throw new AppError("INTERNAL_ERROR", "We couldn't send the code. Check the number and try again.");
    }
    return ok({ phone });
  } catch (err) {
    return fail(err, fieldErrorsOf(err));
  }
}

/** Step 2 of phone auth: verify OTP and establish the session. */
export async function verifyPhoneOtp(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  let redirectTo: string;
  try {
    const { phone, token, name } = parseOrThrow(phoneVerifySchema, input);
    const ip = await clientIp();
    if (!checkRateLimit(`verify:${ip}`, { limit: 20, windowMs: 10 * 60_000 }).ok) {
      throw new AppError("RATE_LIMITED");
    }
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    if (error || !data.user) {
      throw new AppError("VALIDATION_ERROR", "That code is incorrect or has expired.", { token: ["Incorrect or expired code"] });
    }
    // Ensure the profile has a display name (existing users may have signed up without one).
    if (name) {
      await supabase.from("users").update({ name }).eq("id", data.user.id).is("name", null);
    }
    const { data: profile } = await supabase.from("users").select("role").eq("id", data.user.id).maybeSingle();
    redirectTo = homeFor(profile?.role);
  } catch (err) {
    return fail(err, fieldErrorsOf(err));
  }
  return ok({ redirectTo });
}

/** Email + password login (shop owners, admins; customers may also use it). */
export async function signInWithPassword(input: unknown, expectRole?: UserRole): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    const { email, password } = parseOrThrow(emailLoginSchema, input);
    const ip = await clientIp();
    if (!checkRateLimit(`login:${ip}`, { limit: 20, windowMs: 10 * 60_000 }).ok) throw new AppError("RATE_LIMITED");

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      throw new AppError("UNAUTHORIZED", "Incorrect email or password.");
    }
    const { data: profile } = await supabase.from("users").select("role, is_active").eq("id", data.user.id).maybeSingle();
    if (profile && !profile.is_active) {
      await supabase.auth.signOut();
      throw new AppError("FORBIDDEN", "This account has been deactivated.");
    }
    if (expectRole && profile?.role !== expectRole && profile?.role !== "admin") {
      await supabase.auth.signOut();
      throw new AppError("FORBIDDEN", `This login is for ${expectRole === "admin" ? "administrators" : "shop owners"} only.`);
    }
    return ok({ redirectTo: homeFor(profile?.role) });
  } catch (err) {
    return fail(err, fieldErrorsOf(err));
  }
}

/** Shop owner account creation (email + password). The shop itself is registered next. */
export async function signUpOwner(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    const { name, email, phone, password } = parseOrThrow(ownerSignupSchema, input);
    const ip = await clientIp();
    if (!checkRateLimit(`signup:${ip}`, { limit: 10, windowMs: 60 * 60_000 }).ok) throw new AppError("RATE_LIMITED");

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: "shop_owner", phone } },
    });
    if (error) {
      if (/already registered|already exists/i.test(error.message)) {
        throw new AppError("CONFLICT", "An account with this email already exists. Please sign in.");
      }
      if (/password/i.test(error.message)) throw new AppError("VALIDATION_ERROR", error.message, { password: [error.message] });
      throw new AppError("INTERNAL_ERROR", "We couldn't create your account. Please try again.");
    }
    if (data.user && !data.session) {
      // Email confirmation is enabled on this project.
      return ok({ redirectTo: `/shop/login?confirm=1&email=${encodeURIComponent(email)}` });
    }
    if (data.user) {
      await supabase.from("users").update({ phone }).eq("id", data.user.id);
    }
    return ok({ redirectTo: "/shop/register" });
  } catch (err) {
    return fail(err, fieldErrorsOf(err));
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function updateProfile(input: unknown): Promise<ActionResult<{ name: string }>> {
  try {
    const profile = await assertProfile();
    const data = parseOrThrow(profileUpdateSchema, input);
    const supabase = await createClient();
    const { error } = await supabase
      .from("users")
      .update({ name: data.name, email: data.email ?? profile.email, profile_image: data.profile_image ?? profile.profile_image })
      .eq("id", profile.id);
    if (error) throw error;
    return ok({ name: data.name });
  } catch (err) {
    return fail(err, fieldErrorsOf(err));
  }
}
