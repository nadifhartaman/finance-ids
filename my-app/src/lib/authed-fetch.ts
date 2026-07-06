import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./session-cookie";

/** Server-only: forwards the session cookie as a Bearer token to the backend API. */
export async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const apiUrl = process.env.API_URL ?? "http://localhost:4000";
  return fetch(`${apiUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.headers ?? {}),
      "content-type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
}
