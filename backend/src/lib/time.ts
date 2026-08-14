import { env } from "./env.js";

/**
 * The single source of "today" for every endpoint. APP_TODAY (env) wins so a
 * demo database frozen in June still shows June as "this month"; unset it and
 * the real clock takes over. No other file may call `new Date()` for business
 * logic — always go through here.
 */
export function getToday(): Date {
  if (env.APP_TODAY) {
    const parsed = new Date(`${env.APP_TODAY}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`APP_TODAY is not a valid date: ${env.APP_TODAY}`);
    }
    return parsed;
  }
  return new Date();
}

/** First day of the month containing `date`, as YYYY-MM-DD (UTC). */
export function monthStart(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** First day of the month before the one containing `date`, as YYYY-MM-DD. */
export function previousMonthStart(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
  return monthStart(d);
}

/** Last day of the month containing `date`, as YYYY-MM-DD (UTC). */
export function monthEnd(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** True if the ISO date string falls in the same UTC month as `date`. */
export function isSameMonth(iso: string, date: Date): boolean {
  return iso.slice(0, 7) === monthStart(date).slice(0, 7);
}

/** Whole days from `fromIso` to `to` (positive when `to` is later). */
export function daysBetween(fromIso: string, to: Date): number {
  const from = new Date(`${fromIso}T00:00:00Z`);
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}
