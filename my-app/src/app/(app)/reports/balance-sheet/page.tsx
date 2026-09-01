import AsOfDateInput from "@/components/reports/AsOfDateInput";
import StatementTable, { type StatementLine, type StatementSection } from "@/components/reports/StatementTable";
import { getTrialBalance } from "@/lib/api";
import { APP_ROUTES } from "@/lib/routes";
import type { TrialBalanceRow } from "@/lib/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function toLines(rows: TrialBalanceRow[], sign: 1 | -1): StatementLine[] {
  return rows
    .filter((r) => r.balance * sign !== 0)
    .map((r) => ({ code: r.accountCode, label: r.accountName, amount: r.balance * sign }));
}

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  const { asOf: asOfParam } = await searchParams;
  const asOf = asOfParam ?? todayIso();
  const { accounts } = await getTrialBalance(asOf);

  const assetRows = accounts.filter((a) => a.accountType === "asset");
  const liabilityRows = accounts.filter((a) => a.accountType === "liability");
  const equityRows = accounts.filter((a) => a.accountType === "equity");
  const revenueRows = accounts.filter((a) => a.accountType === "revenue");
  const expenseRows = accounts.filter((a) => a.accountType === "expense");

  const assetLines = toLines(assetRows, 1);
  const liabilityLines = toLines(liabilityRows, -1);
  const equityLines = toLines(equityRows, -1);

  const totalAssets = assetLines.reduce((sum, l) => sum + l.amount, 0);
  const totalLiabilities = liabilityLines.reduce((sum, l) => sum + l.amount, 0);
  const totalEquityBase = equityLines.reduce((sum, l) => sum + l.amount, 0);

  // No period-close process exists yet — revenue/expense accounts never roll
  // into retained earnings, so the inception-to-date trial balance still
  // carries every posting as current-period activity. Fold it into equity
  // the way a real Neraca's "Laba Berjalan" line would, so Assets = L + E.
  const revenue = revenueRows.reduce((sum, r) => sum - r.balance, 0);
  const expenses = expenseRows.reduce((sum, r) => sum + r.balance, 0);
  const currentPeriodEarnings = revenue - expenses;

  const equitySection: StatementSection = {
    title: "EQUITY",
    lines: [...equityLines, { label: "Current period earnings", amount: currentPeriodEarnings }],
    total: totalEquityBase + currentPeriodEarnings,
    totalLabel: "Total equity",
  };

  const totalLiabilitiesAndEquity = totalLiabilities + equitySection.total;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-title">Balance sheet</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            What we own, what we owe, and what&apos;s left over, as of {asOf}.
          </p>
        </div>
        <AsOfDateInput asOf={asOf} basePath={APP_ROUTES.balanceSheet} />
      </header>

      <div className="mt-6 space-y-6">
        <StatementTable
          sections={[{ title: "ASSETS", lines: assetLines, total: totalAssets, totalLabel: "Total assets" }]}
        />
        <StatementTable
          sections={[
            { title: "LIABILITIES", lines: liabilityLines, total: totalLiabilities, totalLabel: "Total liabilities" },
            equitySection,
          ]}
          grandTotal={{ label: "Total liabilities + equity", amount: totalLiabilitiesAndEquity }}
          balanceCheck={{ label: "Difference (must be 0)", amount: totalAssets - totalLiabilitiesAndEquity }}
        />
      </div>

      <p className="mt-4 text-xs text-ink-muted">
        Owner capital contributions and opening balances have no recording flow yet, so equity may read low relative
        to reality — see the accounting docs for known gaps.
      </p>
    </>
  );
}
