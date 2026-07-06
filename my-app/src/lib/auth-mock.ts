/**
 * ⚠️ MOCK auth — no real login yet. (Data comes from api.ts)
 * The "current user" is whichever mock user the `mock-role` cookie points
 * at (switchable from the Topbar user menu). When the backend API exists,
 * replace this with a session read / `GET /me` fetch and delete this file;
 * `roles.ts` stays.
 */
import { cookies } from "next/headers";
import { mockUsers, type AppUser } from "./roles";

export const MOCK_ROLE_COOKIE = "mock-role";

/** Director is the default persona — the dashboard's primary user. */
export async function getCurrentUser(): Promise<AppUser> {
  const cookieStore = await cookies();
  const role = cookieStore.get(MOCK_ROLE_COOKIE)?.value;
  const user = mockUsers.find((u) => u.role === role);
  return user ?? mockUsers.find((u) => u.role === "director")!;
}
