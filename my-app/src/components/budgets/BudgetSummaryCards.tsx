import {
  ChartBarIcon,
  TrendingUpIcon,
  WalletIcon,
} from "@/components/shell/icons";
import { SummaryCard } from "@/components/ui/summary-card";
import { formatRupiah } from "@/lib/format";
import type { BudgetScope, BudgetTotals } from "@/lib/types";

export default function BudgetSummaryCards({
  totals,
  scope,
}: {
  totals: BudgetTotals;
  scope: BudgetScope;
}) {
  const budgetLabel =
    scope.kind === "all"
      ? "All project budgets"
      : scope.isCurrent
        ? "Total budget this month"
        : `Total budget — ${scope.label}`;

  const CARDS = [
    {
      label: budgetLabel,
      value: formatRupiah(totals.budget),
      Icon: WalletIcon,
      iconClasses: "bg-primary-50 text-primary-500",
    },
    {
      label: "Spent so far",
      value: formatRupiah(totals.spent),
      Icon: TrendingUpIcon,
      iconClasses: "bg-chip-warning-bg text-chip-warning-icon",
    },
    {
      label: "Left to spend",
      value: formatRupiah(Math.max(totals.remaining, 0)),
      Icon: WalletIcon,
      iconClasses: "bg-chip-success-bg text-chip-success-icon",
    },
    {
      label: "Percent of budget used",
      value: `${totals.pctUsed}%`,
      Icon: ChartBarIcon,
      iconClasses: "bg-primary-50 text-primary-500",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CARDS.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  );
}
