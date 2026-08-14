/** Shared request-input validators used across routes. */

/** True for a YYYY-MM-DD string. Does not check the date is real (e.g. 2026-02-30 passes) — callers that need that should parse and re-check. */
export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
