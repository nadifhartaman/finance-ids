/**
 * Shared fetch wrapper for every call into the Express API. Exists because a
 * dropped keep-alive socket (`UND_ERR_SOCKET: other side closed` — undici
 * reusing a pooled connection Express had already closed, e.g. after a
 * `tsx watch` restart) used to surface as a generic network failure that
 * getCurrentUser() treated as "logged out". That redirected to /login, which
 * proxy.ts then bounced back to / because the session cookie was still
 * present — an infinite redirect loop with no termination condition. Backend
 * reachability and auth validity must never be conflated again.
 */

const RETRYABLE_CODES = new Set(["UND_ERR_SOCKET", "ECONNRESET", "ECONNREFUSED"]);

export class BackendUnreachableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "BackendUnreachableError";
  }
}

function errorCode(err: unknown): string | undefined {
  if (!(err instanceof Error)) return undefined;
  const direct = (err as NodeJS.ErrnoException).code;
  if (typeof direct === "string") return direct;
  const nested = (err.cause as NodeJS.ErrnoException | undefined)?.code;
  return typeof nested === "string" ? nested : undefined;
}

/**
 * At most one retry, only for a dropped connection (never for 4xx/5xx, which
 * `fetch` doesn't throw for anyway). Every caller of this is an idempotent
 * GET, so retrying once is safe and is the only thing that survives a
 * `tsx watch` restart landing mid-request.
 */
export async function fetchBackend(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (cause) {
      if (attempt === 0 && RETRYABLE_CODES.has(errorCode(cause) ?? "")) continue;
      if (cause instanceof DOMException && cause.name === "TimeoutError") {
        throw new BackendUnreachableError(`Timed out after ${timeoutMs}ms fetching ${url}`, { cause });
      }
      throw new BackendUnreachableError(`Could not reach the data service (${url})`, { cause });
    }
  }
}
