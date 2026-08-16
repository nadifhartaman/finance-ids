import Link from "next/link";
import ExpenseTable from "@/components/money-out/ExpenseTable";
import { getRequiredUser } from "@/lib/auth";
import { getExpenses } from "@/lib/api";
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

  const [user, { data: expenses }] = await Promise.all([getRequiredUser(), getExpenses()]);
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

      <div className="mt-6">
        <ExpenseTable expenses={expenses} canWrite={canWrite} initialCategory={category} />
      </div>
    </>
  );
}
