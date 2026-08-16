import { CreditCardIcon, LandmarkIcon, ReceiptIcon, WalletIcon } from "@/components/shell/icons";
import { KpiCard } from "@/components/ui/kpi-card";
import { formatDate } from "@/lib/format";
import type { DebtOutstandingRow } from "@/lib/types";

function nextMaturity(loans: DebtOutstandingRow[]): string {
  const dated = loans.filter((l) => l.maturityDate).sort((a, b) => a.maturityDate!.localeCompare(b.maturityDate!));
  return dated[0]?.maturityDate ? formatDate(dated[0].maturityDate) : "None set";
}

export default function DebtKpiRow({ loans }: { loans: DebtOutstandingRow[] }) {
  const totalOutstanding = loans.reduce((sum, l) => sum + l.outstandingPrincipal, 0);
  const totalInterestPaid = loans.reduce((sum, l) => sum + l.interestPaid, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Outstanding principal"
        value={totalOutstanding}
        Icon={LandmarkIcon}
        iconClasses="bg-chip-error-bg text-chip-error-icon"
      />
      <div className="rounded-2xl border border-card-border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
            <CreditCardIcon className="size-5" />
          </span>
          <h3 className="text-sm font-medium text-ink-secondary">Active loans</h3>
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-title tabular-nums">{loans.length}</p>
      </div>
      <KpiCard
        label="Interest paid to date"
        value={totalInterestPaid}
        Icon={WalletIcon}
        iconClasses="bg-chip-warning-bg text-chip-warning-icon"
      />
      <div className="rounded-2xl border border-card-border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-chip-success-bg text-chip-success-icon">
            <ReceiptIcon className="size-5" />
          </span>
          <h3 className="text-sm font-medium text-ink-secondary">Next maturity</h3>
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-title">{nextMaturity(loans)}</p>
      </div>
    </div>
  );
}
