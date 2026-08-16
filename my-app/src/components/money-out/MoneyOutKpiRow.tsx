import { ArrowDownIcon, BellIcon, CreditCardIcon } from "@/components/shell/icons";
import { KpiCard } from "@/components/ui/kpi-card";
import { getApAging, getCashFlow } from "@/lib/api";
import { APP_ROUTES } from "@/lib/routes";

/** Ledger-backed headline numbers for Money Out: Money paid out, We owe, Overdue bills — over the same date range as the page's BudgetScopeSelect. */
export default async function MoneyOutKpiRow({
  range,
}: {
  range: { start: string; end: string; prevStart: string; prevEnd: string };
}) {
  const [cashFlow, apAging] = await Promise.all([
    getCashFlow(range.start, range.end, "month"),
    getApAging(range.end),
  ]);

  const weOwe = apAging.buckets.reduce((sum, b) => sum + b.amount, 0);
  const overdue = apAging.buckets
    .filter((b) => b.label === "31-60" || b.label === "61-90" || b.label === "90+")
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <KpiCard
        label="Money paid out"
        sublabel={`${range.start} – ${range.end}`}
        value={cashFlow.totalOutflow}
        Icon={ArrowDownIcon}
        iconClasses="bg-primary-50 text-primary-500"
      />
      <KpiCard
        label="Unpaid bills"
        sublabel={`As of ${range.end}`}
        value={weOwe}
        href={APP_ROUTES.payables}
        Icon={CreditCardIcon}
        iconClasses="bg-chip-error-bg text-chip-error-icon"
      />
      <KpiCard
        label="Overdue bills"
        sublabel={`More than 30 days late · as of ${range.end}`}
        value={overdue}
        href={APP_ROUTES.payables}
        Icon={BellIcon}
        iconClasses="bg-chip-error-bg text-chip-error-icon"
      />
    </div>
  );
}
