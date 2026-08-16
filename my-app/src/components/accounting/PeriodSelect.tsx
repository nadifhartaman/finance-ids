"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const MONTH_LABEL = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

function lastTwelveMonths(): { value: string; label: string }[] {
  const now = new Date();
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    months.push({ value, label: MONTH_LABEL.format(d) });
  }
  return months;
}

/** Fiscal period picker — pushes ?period= on the given page. */
export default function PeriodSelect({ period, basePath }: { period: string; basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const options = lastTwelveMonths();

  return (
    <label className="flex items-center gap-2 text-sm text-ink-secondary">
      Period
      <select
        value={period}
        disabled={isPending}
        onChange={(e) => {
          const next = new URLSearchParams(searchParams.toString());
          next.set("period", e.target.value);
          startTransition(() => {
            router.push(`${basePath}?${next.toString()}`);
          });
        }}
        className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm font-medium text-title disabled:opacity-60"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {isPending && <span className="text-xs text-ink-muted">Updating…</span>}
    </label>
  );
}
