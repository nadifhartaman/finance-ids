"use server";

/**
 * ⚠️ MOCK auth — server action behind the Topbar role switcher.
 * Deleted together with auth-mock.ts when real auth lands.
 */
import { cookies } from "next/headers";
import { MOCK_ROLE_COOKIE } from "./auth-mock";
import { isRole } from "./roles";

export async function setMockRole(role: string): Promise<void> {
  if (!isRole(role)) return;
  const cookieStore = await cookies();
  cookieStore.set(MOCK_ROLE_COOKIE, role, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
}
