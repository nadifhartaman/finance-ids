import {
  ChartBarIcon,
  TrendingUpIcon,
  WalletIcon,
} from "@/components/shell/icons";
import { SummaryCard } from "@/components/ui/summary-card";
import {
  formatRupiah,
  pctBudgetUsed,
  totalBudget,
  totalRemaining,
  totalSpent,
} from "@/lib/mock-data";

const CARDS = [
  {
    label: "Total budget this month",
    value: formatRupiah(totalBudget),
    Icon: WalletIcon,
    iconClasses: "bg-primary-50 text-primary-500",
  },
  {
    label: "Spent so far",
    value: formatRupiah(totalSpent),
    Icon: TrendingUpIcon,
    iconClasses: "bg-chip-warning-bg text-chip-warning-icon",
  },
  {
    label: "Left to spend",
    value: formatRupiah(totalRemaining),
    Icon: WalletIcon,
    iconClasses: "bg-chip-success-bg text-chip-success-icon",
  },
  {
    label: "Percent of budget used",
    value: `${pctBudgetUsed}%`,
    Icon: ChartBarIcon,
    iconClasses: "bg-primary-50 text-primary-500",
  },
];

export default function BudgetSummaryCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CARDS.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  );
}
