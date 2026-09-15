import { NextResponse, type NextRequest } from "next/server";
import { homeFor, safeRedirectPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /auth/callback
 * OAuth return URL: exchanges the PKCE code for a session (cookies are set on
 * the response) and sends the user home, or back to /login with an error code.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  const backToLogin = (error: "oauth" | "deactivated") => {
    const url = new URL("/login", origin);
    url.searchParams.set("error", error);
    if (next) url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  };

  if (!code) return backToLogin("oauth");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return backToLogin("oauth");

  const { data: profile } = await supabase.from("users").select("role, is_active").eq("id", data.user.id).maybeSingle();
  if (profile && !profile.is_active) {
    await supabase.auth.signOut();
    return backToLogin("deactivated");
  }

  return NextResponse.redirect(new URL(safeRedirectPath(next, homeFor(profile?.role)), origin));
}
