import {
  ChartBarIcon,
  TrendingUpIcon,
  WalletIcon,
} from "@/components/shell/icons";
import { SummaryCard } from "@/components/ui/summary-card";
import { formatRupiah } from "@/lib/format";
import type { BudgetTotals } from "@/lib/types";

export default function BudgetSummaryCards({ totals }: { totals: BudgetTotals }) {
  const CARDS = [
    {
      label: "Total budget this month",
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
      value: formatRupiah(totals.remaining),
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
