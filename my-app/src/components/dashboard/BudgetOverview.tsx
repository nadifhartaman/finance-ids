import type { BudgetHealthKind, BudgetItem, BudgetTotals } from "@/lib/types";
import { formatRupiah } from "@/lib/format";

const BAR_COLOR: Record<BudgetHealthKind, string> = {
  "on-track": "bg-primary-600",
  "near-limit": "bg-chip-warning-icon",
  over: "bg-chip-error-icon",
};

// Mirrors backend/src/lib/derive.ts's budgetHealth() thresholds — totals
// doesn't carry a health kind of its own, so the overall bar's color is
// derived here from pctUsed the same way.
function healthKindFor(pctUsed: number): BudgetHealthKind {
  if (pctUsed > 100) return "over";
  if (pctUsed >= 90) return "near-limit";
  return "on-track";
}

export default function BudgetOverview({
  totals,
  categoryBudgets,
}: {
  totals: BudgetTotals;
  categoryBudgets: BudgetItem[];
}) {
  const overallKind = healthKindFor(totals.pctUsed);

  return (
    <div>
      <p className="text-sm text-ink-secondary">
        Spent {formatRupiah(totals.spent)} of {formatRupiah(totals.budget)}{" "}
        planned this month
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-soft">
        <div
          className={`h-full rounded-full ${BAR_COLOR[overallKind]}`}
          style={{ width: `${Math.min(totals.pctUsed, 100)}%` }}
        />
      </div>

      <div className="mt-4 space-y-3">
        {categoryBudgets.map((item) => (
          <div key={item.id}>
            <div className="flex items-center justify-between text-xs text-ink-secondary">
              <span>{item.name}</span>
              <span>
                {item.health
                  ? `${item.health.pctUsed}% used`
                  : `Spent ${formatRupiah(item.spent)}`}
              </span>
            </div>
            {item.health && (
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-soft">
                <div
                  className={`h-full rounded-full ${BAR_COLOR[item.health.kind]}`}
                  style={{ width: `${Math.min(item.health.pctUsed, 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
