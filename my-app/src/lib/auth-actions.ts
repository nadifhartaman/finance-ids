"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "./session-cookie";

export interface LoginState {
  error: string | null;
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return { error: "Email and password are required." };
  }

  const apiUrl = process.env.API_URL ?? "http://localhost:4000";
  const res = await fetch(`${apiUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.error ?? "Something went wrong. Please try again." };
  }

  const { token, expiresAt } = await res.json();
  const maxAge = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });

  redirect("/");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
