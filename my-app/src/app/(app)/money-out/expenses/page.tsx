import Link from "next/link";
import { ArrowDownIcon } from "@/components/shell/icons";
import ExpenseTable from "@/components/money-out/ExpenseTable";
import ExpensesByCategoryDonut from "@/components/money-out/ExpensesByCategoryDonut";
import { KpiCard } from "@/components/ui/kpi-card";
import { getRequiredUser } from "@/lib/auth";
import { getBudgets, getExpenses } from "@/lib/api";
import { can } from "@/lib/roles";
import { APP_ROUTES } from "@/lib/routes";
import type { ExpenseCategory } from "@/lib/types";

const VALID_CATEGORIES: readonly ExpenseCategory[] = ["payroll", "operations", "project_costs"];

function isExpenseCategory(value: string): value is ExpenseCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(value);
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: categoryParam } = await searchParams;
  const category = categoryParam && isExpenseCategory(categoryParam) ? categoryParam : null;

  const [user, { data: expenses }, budgets] = await Promise.all([
    getRequiredUser(),
    getExpenses(),
    getBudgets(),
  ]);
  const canWrite = can(user.role, "spending.write");

  return (
    <>
      <Link
        href={APP_ROUTES.payables}
        className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-title"
      >
        ← Back to Money Out
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-title">Expenses</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Everything we&apos;ve spent or still owe.
        </p>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-[300px_1fr]">
        <KpiCard
          label="Total expenses"
          sublabel="All time"
          value={budgets.totals.spent}
          Icon={ArrowDownIcon}
          iconClasses="bg-primary-50 text-primary-500"
        />
        <div className="rounded-2xl border border-card-border bg-card p-4 shadow-xs">
          <h2 className="text-sm font-medium text-ink-secondary">Spending by category</h2>
          <div className="mt-4">
            <ExpensesByCategoryDonut data={budgets.categoryBudgets} />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ExpenseTable expenses={expenses} canWrite={canWrite} initialCategory={category} />
      </div>
    </>
  );
}
