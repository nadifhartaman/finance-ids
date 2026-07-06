import {
  ChartBarIcon,
  TrendingUpIcon,
  WalletIcon,
} from "@/components/shell/icons";
import { SummaryCard } from "@/components/ui/summary-card";
import { formatRupiah } from "@/lib/format";

interface TrendsSummaryCardsProps {
  revenueThisYear: number;
  yearTargetPct: number;
  governmentSharePct: number;
  topProductLine: string;
}

export default function TrendsSummaryCards({
  revenueThisYear,
  yearTargetPct,
  governmentSharePct,
  topProductLine,
}: TrendsSummaryCardsProps) {
  const CARDS = [
    {
      label: "Revenue this year",
      value: formatRupiah(revenueThisYear),
      Icon: WalletIcon,
      iconClasses: "bg-primary-50 text-primary-500",
    },
    {
      label: "Of this year's target",
      value: `${yearTargetPct}%`,
      Icon: TrendingUpIcon,
      iconClasses: "bg-chip-success-bg text-chip-success-icon",
    },
    {
      label: "From government clients",
      value: `${governmentSharePct}%`,
      Icon: ChartBarIcon,
      iconClasses: "bg-primary-50 text-primary-500",
    },
    {
      label: "Biggest product line",
      value: topProductLine,
      Icon: ChartBarIcon,
      iconClasses: "bg-chip-warning-bg text-chip-warning-icon",
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
