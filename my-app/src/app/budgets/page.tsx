import BudgetInsights from "@/components/budgets/BudgetInsights";
import BudgetList from "@/components/budgets/BudgetList";
import BudgetProgressRing from "@/components/budgets/BudgetProgressRing";
import BudgetSummaryCards from "@/components/budgets/BudgetSummaryCards";
import { getCurrentUser } from "@/lib/auth-mock";
import { categoryBudgets, projectBudgets } from "@/lib/mock-data";
import { can } from "@/lib/roles";

export default async function BudgetsPage() {
  const user = await getCurrentUser();
  const canEdit = can(user.role, "budgets.edit");
  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-title">
          Budgets
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Are we spending more or less than planned?
        </p>
      </header>

      <div className="mt-6">
        <BudgetSummaryCards />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <BudgetProgressRing />
          <BudgetInsights />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="text-lg font-semibold text-title">
              Spending by category
            </h2>
            <div className="mt-3">
              <BudgetList items={categoryBudgets} canEdit={canEdit} />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-title">
              Project budgets
            </h2>
            <div className="mt-3">
              <BudgetList items={projectBudgets} canEdit={canEdit} layout="grid" />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
