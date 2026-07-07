"use client";

import { useRouter } from "next/navigation";
import type { BudgetMonthOption, BudgetScope } from "@/lib/types";

/**
 * The Budgets page's one timeframe control: this month (default), any past
 * month with data, or all time. Pushes ?scope= so the Server Component
 * refetches — every widget on the page changes together.
 */
export default function BudgetScopeSelect({
  scope,
  months,
}: {
  scope: BudgetScope;
  months: BudgetMonthOption[];
}) {
  const router = useRouter();
  const value =
    scope.kind === "all" ? "all" : scope.isCurrent ? "" : (scope.period ?? "");

  return (
    <label className="flex items-center gap-2 text-sm text-ink-secondary">
      Showing
      <select
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          router.push(next === "" ? "/budgets" : `/budgets?scope=${next}`);
        }}
        className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm font-medium text-title"
      >
        <option value="">This month</option>
        {months.map((m) => (
          <option key={m.period} value={m.period}>
            {m.label}
          </option>
        ))}
        <option value="all">All time</option>
      </select>
    </label>
  );
}
