import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
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

/**
 * Shared shape for the simple "PATCH an id, return {error}" mutations —
 * factored out after the same pattern showed up in 5 different action files.
 * Callers invoke this from inside a "use server" function; only the entry
 * point needs the directive, not this helper.
 */
export async function patchAction(
  path: string,
  body: unknown,
  revalidatePaths: string[],
  fallbackError = "Something went wrong.",
): Promise<{ error: string | null }> {
  const res = await authedFetch(path, {
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const responseBody = await res.json().catch(() => null);
    return { error: responseBody?.error ?? fallbackError };
  }
  revalidatePaths.forEach((p) => revalidatePath(p));
  return { error: null };
}
