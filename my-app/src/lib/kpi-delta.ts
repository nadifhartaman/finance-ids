import { formatRupiahExact } from "@/lib/format";

export interface KpiDelta {
  direction: "up" | "down";
  upIsGood: boolean;
  text: string;
}

/** Shared by every ledger-backed KPI row: a value change framed as "vs last period"/"vs period start", never fabricated when there's nothing to compare against. */
export function kpiDelta(
  now: number,
  before: number,
  upIsGood: boolean,
  comparisonLabel = "last period",
): KpiDelta | undefined {
  if (before === now) return undefined;
  const direction: "up" | "down" = now >= before ? "up" : "down";
  return {
    direction,
    upIsGood,
    text: `${formatRupiahExact(Math.abs(now - before))} vs ${
      before === 0 && now !== 0 ? "no prior activity" : comparisonLabel
    }`,
  };
}
