import BudgetInsights from "@/components/budgets/BudgetInsights";
import BudgetItemCard from "@/components/budgets/BudgetItemCard";
import BudgetProgressRing from "@/components/budgets/BudgetProgressRing";
import BudgetSummaryCards from "@/components/budgets/BudgetSummaryCards";
import { categoryBudgets, projectBudgets } from "@/lib/mock-data";

export default function BudgetsPage() {
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
            <div className="mt-3 space-y-4">
              {categoryBudgets.map((item) => (
                <BudgetItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-title">
              Project budgets
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {projectBudgets.map((item) => (
                <BudgetItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
