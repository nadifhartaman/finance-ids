import {
  ChartBarIcon,
  ReceiptIcon,
  TrendingUpIcon,
  WalletIcon,
} from "@/components/shell/icons";
import { SummaryCard } from "@/components/ui/summary-card";
import {
  averageDaysToPay,
  formatRupiah,
  totalAwaiting,
  totalOverdue,
  totalUnpaid,
} from "@/lib/mock-data";

const CARDS = [
  {
    label: "Total unpaid",
    value: formatRupiah(totalUnpaid),
    Icon: WalletIcon,
    iconClasses: "bg-primary-50 text-primary-500",
  },
  {
    label: "Overdue",
    value: formatRupiah(totalOverdue),
    Icon: ReceiptIcon,
    iconClasses: "bg-chip-error-bg text-chip-error-icon",
  },
  {
    label: "Waiting for payment",
    value: formatRupiah(totalAwaiting),
    Icon: TrendingUpIcon,
    iconClasses: "bg-chip-warning-bg text-chip-warning-icon",
  },
  {
    label: "Average days clients take to pay us",
    value: `${averageDaysToPay} days`,
    Icon: ChartBarIcon,
    iconClasses: "bg-chip-success-bg text-chip-success-icon",
  },
];

export default function InvoiceSummaryCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CARDS.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  );
}
