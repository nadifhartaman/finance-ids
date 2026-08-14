import DebtKpiRow from "@/components/debt/DebtKpiRow";
import DebtStatusSelect from "@/components/debt/DebtStatusSelect";
import LoansTable from "@/components/debt/LoansTable";
import { getDebt } from "@/lib/api";
import type { LoanStatus } from "@/lib/types";

function resolveStatus(value?: string): LoanStatus {
  return value === "settled" || value === "cancelled" ? value : "active";
}

export default async function DebtPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status = resolveStatus(statusParam);
  const { loans } = await getDebt(status);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-title">
            Debt
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Money we&apos;ve borrowed and still owe.
          </p>
        </div>
        <DebtStatusSelect status={status} />
      </header>

      <div className="mt-6">
        <DebtKpiRow loans={loans} />
      </div>

      <div className="mt-4 rounded-2xl border border-card-border bg-card p-5 shadow-xs">
        <h2 className="text-lg font-semibold text-title">Loans</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Principal, what&apos;s left to pay, and interest paid so far, per lender.
        </p>
        <div className="mt-5">
          <LoansTable loans={loans} />
        </div>
      </div>

      <p className="mt-4 text-xs text-ink-muted">
        Repayment history and interest schedules aren&apos;t tracked per loan yet — figures above are totals to date.
      </p>
    </>
  );
}
