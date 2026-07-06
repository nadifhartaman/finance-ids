import {
  ChartBarIcon,
  ReceiptIcon,
  TrendingUpIcon,
  WalletIcon,
} from "@/components/shell/icons";
import { SummaryCard } from "@/components/ui/summary-card";
import { formatRupiah } from "@/lib/format";
import type { InvoicesResponse } from "@/lib/types";

export default function InvoiceSummaryCards({ summary }: { summary: InvoicesResponse["summary"] }) {
  const CARDS = [
    {
      label: "Total unpaid",
      value: formatRupiah(summary.totalUnpaid),
      Icon: WalletIcon,
      iconClasses: "bg-primary-50 text-primary-500",
    },
    {
      label: "Overdue",
      value: formatRupiah(summary.totalOverdue),
      Icon: ReceiptIcon,
      iconClasses: "bg-chip-error-bg text-chip-error-icon",
    },
    {
      label: "Waiting for payment",
      value: formatRupiah(summary.totalAwaiting),
      Icon: TrendingUpIcon,
      iconClasses: "bg-chip-warning-bg text-chip-warning-icon",
    },
    {
      label: "Average days clients take to pay us",
      value: `${summary.averageDaysToPay} days`,
      Icon: ChartBarIcon,
      iconClasses: "bg-chip-success-bg text-chip-success-icon",
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
