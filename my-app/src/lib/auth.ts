/**
 * Real session — replaces auth-mock.ts. The frontend never talks to
 * Supabase directly; login and identity both proxy through the Express API.
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "./session-cookie";
import type { AppUser } from "./roles";

export { SESSION_COOKIE };

/**
 * Null when logged out, the token is invalid, or the account is deactivated.
 * Wrapped in React's per-request `cache()` — the (app) layout and every page
 * call this, and without the wrapper each one fired its own GET /me, tripling
 * a Dashboard render's round trips to the backend for no reason.
 */
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const apiUrl = process.env.API_URL ?? "http://localhost:4000";
  const res = await fetch(`${apiUrl}/api/me`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const { user } = await res.json();
  return user as AppUser;
});

/**
 * For pages that need a non-null user. The (app) layout already redirects
 * logged-out visitors before any page renders — this is the defensive
 * fallback for that guard, not the primary enforcement point.
 */
export async function getRequiredUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
