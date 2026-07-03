import {
  ChartBarIcon,
  ReceiptIcon,
  TrendingUpIcon,
  WalletIcon,
} from "@/components/shell/icons";
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
    classes: "bg-primary-50 text-primary-500",
  },
  {
    label: "Overdue",
    value: formatRupiah(totalOverdue),
    Icon: ReceiptIcon,
    classes: "bg-chip-error-bg text-chip-error-icon",
  },
  {
    label: "Waiting for payment",
    value: formatRupiah(totalAwaiting),
    Icon: TrendingUpIcon,
    classes: "bg-chip-warning-bg text-chip-warning-icon",
  },
  {
    label: "Average days clients take to pay us",
    value: `${averageDaysToPay} days`,
    Icon: ChartBarIcon,
    classes: "bg-chip-success-bg text-chip-success-icon",
  },
];

export default function InvoiceSummaryCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CARDS.map((card) => (
        <article
          key={card.label}
          className="rounded-2xl border border-card-border bg-card p-5 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex size-9 items-center justify-center rounded-lg ${card.classes}`}
            >
              <card.Icon className="size-5" />
            </span>
            <h3 className="text-sm font-medium text-ink-secondary">
              {card.label}
            </h3>
          </div>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-title">
            {card.value}
          </p>
        </article>
      ))}
    </div>
  );
}
