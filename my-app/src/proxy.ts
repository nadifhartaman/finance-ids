import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/session-cookie";

/**
 * Optimistic check only — cookie presence, not validity. The (app) layout's
 * GET /me call is the real check; this just avoids a flash of protected UI
 * on a plain client navigation.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (!hasSession && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (hasSession && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\.svg).*)"],
};
