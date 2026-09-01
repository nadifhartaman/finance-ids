import RangeSelect from "@/components/accounting/RangeSelect";
import StatementTable from "@/components/reports/StatementTable";
import { getIncomeStatement } from "@/lib/api";
import { cashFlowRangeBounds, isCashFlowRange, type CashFlowRange } from "@/lib/accounting-period";
import { APP_ROUTES } from "@/lib/routes";

const DEFAULT_RANGE: CashFlowRange = "30d";

export default async function IncomeStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range = isCashFlowRange(rangeParam) ? rangeParam : DEFAULT_RANGE;
  const { from, to } = cashFlowRangeBounds(range);
  const statement = await getIncomeStatement(from, to);

  const revenueLines = statement.revenue.map((l) => ({ code: l.accountCode, label: l.accountName, amount: l.amount }));
  const expenseLines = statement.expenses.map((l) => ({ code: l.accountCode, label: l.accountName, amount: l.amount }));

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-title">Income statement</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Revenue and expenses from {from} to {to}.
          </p>
        </div>
        <RangeSelect range={range} basePath={APP_ROUTES.incomeStatement} />
      </header>

      <div className="mt-6">
        <StatementTable
          sections={[
            { title: "Revenue", lines: revenueLines, total: statement.totalRevenue, totalLabel: "Total revenue" },
            { title: "Expenses", lines: expenseLines, total: statement.totalExpenses, totalLabel: "Total expenses" },
          ]}
          grandTotal={{ label: "Net income", amount: statement.netIncome }}
        />
      </div>
    </>
  );
}
