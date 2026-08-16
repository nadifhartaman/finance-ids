import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * A Route Handler, not a Server Action, because Server Components (layouts,
 * pages) can't set/delete cookies — they can only redirect. Redirecting a
 * bad session straight to /login left the cookie in place, and proxy.ts
 * bounces any request to /login that still has the cookie back to /,
 * which redirected to /login again: an infinite loop. This clears the
 * cookie first, so the /login redirect that follows actually sticks.
 */
export async function GET(request: Request) {
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.redirect(new URL("/login", request.url));
}
