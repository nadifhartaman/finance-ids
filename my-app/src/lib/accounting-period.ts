/**
 * Resolves the accounting dashboard's `?period=YYYY-MM` into bounded date
 * ranges — every section derives its dates from this one object so the
 * header, KPIs, and charts can never disagree about what "this period" means.
 */

const MONTH_LABEL = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

export interface AccountingPeriod {
  /** YYYY-MM, the resolved (validated, defaulted) period. */
  period: string;
  label: string;
  /** YYYY-MM-01 */
  start: string;
  /** last day of the month, YYYY-MM-DD */
  end: string;
  prevStart: string;
  prevEnd: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function monthBounds(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${pad(month)}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${pad(month)}-${pad(lastDay)}`;
  return { start, end };
}

export type CashFlowRange = "7d" | "30d" | "3m" | "6m" | "1y";

const RANGE_DAYS: Record<CashFlowRange, number> = { "7d": 7, "30d": 30, "3m": 90, "6m": 182, "1y": 365 };
const RANGE_GRANULARITY: Record<CashFlowRange, "day" | "week" | "month"> = {
  "7d": "day",
  "30d": "day",
  "3m": "week",
  "6m": "week",
  "1y": "month",
};

export function isCashFlowRange(value: string | undefined): value is CashFlowRange {
  return value !== undefined && value in RANGE_DAYS;
}

/** Bounds for the Cash & Bank chart's range chips — anchored on today, not the selected fiscal period, since "last 7 days" means the calendar week regardless of which month is open. */
export function cashFlowRangeBounds(range: CashFlowRange): { from: string; to: string; granularity: "day" | "week" | "month" } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - RANGE_DAYS[range]);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    granularity: RANGE_GRANULARITY[range],
  };
}

export function dayBefore(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Maps a Money Out `BudgetScope` to a date range for the ledger KPI row, so
 * that page has one period control (`BudgetScopeSelect`), not two disagreeing
 * ones. `kind: "month"` is that calendar month; `kind: "all"` is year-to-date
 * (an "all time" range would swamp the KPI row's period-over-period deltas).
 */
export function scopeToRange(scope: {
  kind: "month" | "all";
  period: string | null;
}): { start: string; end: string; prevStart: string; prevEnd: string } {
  if (scope.kind === "month" && scope.period) {
    const [year, month] = scope.period.split("-").map(Number);
    const { start, end } = monthBounds(year!, month!);
    const prevMonth = month === 1 ? 12 : month! - 1;
    const prevYear = month === 1 ? year! - 1 : year!;
    const prev = monthBounds(prevYear, prevMonth);
    return { start, end, prevStart: prev.start, prevEnd: prev.end };
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const start = `${year}-01-01`;
  const end = now.toISOString().slice(0, 10);
  const prevYear = year - 1;
  return {
    start,
    end,
    prevStart: `${prevYear}-01-01`,
    prevEnd: `${prevYear}-12-31`,
  };
}

/** `periodParam` must be YYYY-MM; anything else (missing, malformed) falls back to the current month. */
export function resolveAccountingPeriod(periodParam?: string): AccountingPeriod {
  const now = new Date();
  const isValid = periodParam !== undefined && /^\d{4}-(0[1-9]|1[0-2])$/.test(periodParam);
  const [year, month] = isValid
    ? periodParam.split("-").map(Number)
    : [now.getUTCFullYear(), now.getUTCMonth() + 1];

  const { start, end } = monthBounds(year!, month!);
  const prevMonth = month === 1 ? 12 : month! - 1;
  const prevYear = month === 1 ? year! - 1 : year!;
  const prev = monthBounds(prevYear, prevMonth);

  return {
    period: `${year}-${pad(month!)}`,
    label: MONTH_LABEL.format(new Date(Date.UTC(year!, month! - 1, 1))),
    start,
    end,
    prevStart: prev.start,
    prevEnd: prev.end,
  };
}
