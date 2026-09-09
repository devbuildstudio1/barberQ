import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/proxy";

const CUSTOMER_PROTECTED = ["/my-queue", "/profile", "/notifications"];
const CUSTOMER_JOIN = /^\/shops\/[^/]+\/join/;

/**
 * Edge proxy: refreshes auth cookies and performs coarse route protection.
 * Fine-grained authorization always happens again in the database (RLS) and
 * in server code; this only avoids rendering pages the user can't use.
 */
export async function proxy(request: NextRequest) {
  const { response, userId, role } = await refreshSession(request);
  const { pathname, search } = request.nextUrl;

  const loginRedirect = (loginPath: string) => {
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  };

  // Admin area
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!userId) return loginRedirect("/admin/login");
    if (role !== "admin") return NextResponse.redirect(new URL("/", request.url));
  }

  // Shop owner area
  if (pathname.startsWith("/shop") && !pathname.startsWith("/shops")) {
    const isPublic = pathname === "/shop/login" || pathname === "/shop/register";
    if (!isPublic) {
      if (!userId) return loginRedirect("/shop/login");
      if (role !== "shop_owner" && role !== "admin") return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Customer-only pages
  if (CUSTOMER_PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || CUSTOMER_JOIN.test(pathname)) {
    if (!userId) return loginRedirect("/login");
  }

  // Signed-in users shouldn't see auth pages
  if (userId && (pathname === "/login" || pathname === "/register")) {
    const dest = role === "admin" ? "/admin/dashboard" : role === "shop_owner" ? "/shop/dashboard" : "/shops";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static assets and images
    "/((?!_next/static|_next/image|favicon.ico|icon.png|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
