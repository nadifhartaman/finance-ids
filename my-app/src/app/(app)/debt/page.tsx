import Link from "next/link";
import DebtKpiRow from "@/components/debt/DebtKpiRow";
import DebtStatusSelect from "@/components/debt/DebtStatusSelect";
import LoansTable from "@/components/debt/LoansTable";
import { getRequiredUser } from "@/lib/auth";
import { getDebt } from "@/lib/api";
import { can } from "@/lib/roles";
import { APP_ROUTES } from "@/lib/routes";
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
  const [user, { loans }] = await Promise.all([getRequiredUser(), getDebt(status)]);
  const canWrite = can(user.role, "accounting.post");

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-title">
          Debt
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Money we&apos;ve borrowed and still owe.
        </p>
      </header>

      <div className="mt-6">
        <DebtKpiRow loans={loans} />
      </div>

      <div className="mt-4 rounded-2xl border border-card-border bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-title">Loans</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Principal, what&apos;s left to pay, and interest paid so far, per lender.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canWrite && (
              <Link
                href={APP_ROUTES.newLoan}
                className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                New loan
              </Link>
            )}
            <DebtStatusSelect status={status} />
          </div>
        </div>
        <div className="mt-5">
          <LoansTable loans={loans} canWrite={canWrite} />
        </div>
      </div>

      <p className="mt-4 text-xs text-ink-muted">
        Repayment history and interest schedules aren&apos;t tracked per loan yet — figures above are totals to date.
      </p>
    </>
  );
}
