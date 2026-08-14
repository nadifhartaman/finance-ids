import { BellIcon, ReceiptIcon, TrendingUpIcon, WalletIcon } from "@/components/shell/icons";
import { KpiCard } from "@/components/ui/kpi-card";
import { getArAging, getCashFlow, getPlMonthly } from "@/lib/api";
import { kpiDelta } from "@/lib/kpi-delta";
import { APP_ROUTES } from "@/lib/routes";
import type { AccountingPeriod } from "@/lib/accounting-period";

/** Ledger-backed headline numbers for Money In: Revenue, Money received, Owed to us, Overdue — each compared against the same-length prior period so the page never disagrees with itself. */
export default async function MoneyInKpiRow({ periodInfo }: { periodInfo: AccountingPeriod }) {
  const [currentPl, prevPl, cashFlow, arAging] = await Promise.all([
    getPlMonthly(periodInfo.start, periodInfo.end),
    getPlMonthly(periodInfo.prevStart, periodInfo.prevEnd),
    getCashFlow(periodInfo.start, periodInfo.end, "month"),
    getArAging(periodInfo.end),
  ]);

  const current = currentPl.months[0] ?? { revenue: 0, expenses: 0, netIncome: 0 };
  const prev = prevPl.months[0] ?? { revenue: 0, expenses: 0, netIncome: 0 };
  const owedToUs = arAging.buckets.reduce((sum, b) => sum + b.amount, 0);
  const overdue = arAging.buckets
    .filter((b) => b.label === "31-60" || b.label === "61-90" || b.label === "90+")
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Revenue"
        sublabel={periodInfo.label}
        value={current.revenue}
        delta={kpiDelta(current.revenue, prev.revenue, true)}
        Icon={TrendingUpIcon}
        iconClasses="bg-chip-success-bg text-chip-success-icon"
      />
      <KpiCard
        label="Money received"
        sublabel={periodInfo.label}
        value={cashFlow.totalInflow}
        Icon={WalletIcon}
        iconClasses="bg-primary-50 text-primary-500"
      />
      <KpiCard
        label="Owed to us"
        sublabel={`As of ${periodInfo.end}`}
        value={owedToUs}
        href={APP_ROUTES.receivables}
        Icon={ReceiptIcon}
        iconClasses="bg-chip-warning-bg text-chip-warning-icon"
      />
      <KpiCard
        label="Overdue 30+ days"
        sublabel={`As of ${periodInfo.end}`}
        value={overdue}
        href={APP_ROUTES.receivables}
        Icon={BellIcon}
        iconClasses="bg-chip-error-bg text-chip-error-icon"
      />
    </div>
  );
}
