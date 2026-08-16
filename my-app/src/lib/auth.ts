/**
 * Real session — replaces auth-mock.ts. The frontend never talks to
 * Supabase directly; login and identity both proxy through the Express API.
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchBackend } from "./backend-fetch";
import { SESSION_COOKIE } from "./session-cookie";
import type { AppUser } from "./roles";

export { SESSION_COOKIE };

/**
 * Null means genuinely logged out: no cookie, or the backend said 401/403
 * (invalid token / deactivated account). A network failure or 5xx is NOT the
 * same thing and must throw (BackendUnreachableError, from fetchBackend) —
 * treating it as logged-out is what caused an infinite redirect loop, see
 * backend-fetch.ts's comment. Wrapped in React's per-request `cache()` — the
 * (app) layout and every page call this, and without the wrapper each one
 * fired its own GET /me.
 */
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const apiUrl = process.env.API_URL ?? "http://localhost:4000";
  const res = await fetchBackend(
    `${apiUrl}/api/me`,
    { cache: "no-store", headers: { Authorization: `Bearer ${token}` } },
    15_000,
  );
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) {
    throw new Error(`GET /api/me failed: ${res.status} ${res.statusText}`);
  }

  const { user } = await res.json();
  return user as AppUser;
});

/**
 * For pages that need a non-null user. The (app) layout already redirects
 * logged-out visitors before any page renders — this is the defensive
 * fallback for that guard, not the primary enforcement point. Redirects to
 * /logout, not /login directly — /logout clears the session cookie via a
 * Route Handler (Server Components can't set cookies), which is what makes
 * this redirect actually terminate instead of proxy.ts bouncing a
 * cookie-still-present visitor straight back.
 */
export async function getRequiredUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/logout");
  return user;
}
