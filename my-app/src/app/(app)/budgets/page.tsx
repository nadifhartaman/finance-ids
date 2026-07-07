import BudgetInsights from "@/components/budgets/BudgetInsights";
import BudgetList from "@/components/budgets/BudgetList";
import BudgetProgressRing from "@/components/budgets/BudgetProgressRing";
import BudgetScopeSelect from "@/components/budgets/BudgetScopeSelect";
import BudgetSummaryCards from "@/components/budgets/BudgetSummaryCards";
import { getRequiredUser } from "@/lib/auth";
import { getBudgets } from "@/lib/api";
import { can } from "@/lib/roles";

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope: scopeParam } = await searchParams;
  // Drop garbage query values instead of letting the API 400 the whole page.
  const requestedScope =
    scopeParam === "all" || /^\d{4}-(0[1-9]|1[0-2])-01$/.test(scopeParam ?? "")
      ? scopeParam
      : undefined;

  const [user, budgets] = await Promise.all([getRequiredUser(), getBudgets(requestedScope)]);
  const canEdit = can(user.role, "budgets.edit");
  const {
    scope,
    availableMonths,
    categoryBudgets,
    projectBudgets,
    totals,
    projectNote,
    budgetInsights,
  } = budgets;

  // Category plans can only be edited for the month being planned (the
  // current one); project budgets are whole-project, edited in All time.
  const canEditCategories = canEdit && scope.isCurrent;
  const canEditProjects = canEdit && scope.kind === "all";

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-title">
            Budgets
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Are we spending more or less than planned?
          </p>
        </div>
        <BudgetScopeSelect scope={scope} months={availableMonths} />
      </header>

      <div className="mt-6">
        <BudgetSummaryCards totals={totals} scope={scope} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <BudgetProgressRing totals={totals} scope={scope} />
          <BudgetInsights insights={budgetInsights} />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="text-lg font-semibold text-title">
              Spending by category — {scope.label}
            </h2>
            <div className="mt-3">
              <BudgetList
                items={categoryBudgets}
                canEdit={canEditCategories}
                kind="category"
                noPlanHint={scope.kind === "month" ? "No plan set" : undefined}
              />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-title">
              {scope.kind === "all"
                ? "Project budgets — whole project"
                : `Spending by project — ${scope.label}`}
            </h2>
            <p className="mt-1 text-sm text-ink-secondary">{projectNote}</p>
            <div className="mt-3">
              <BudgetList
                items={projectBudgets}
                canEdit={canEditProjects}
                kind="project"
                layout="grid"
                initialCount={6}
                noPlanHint={scope.kind === "all" ? "No budget set" : undefined}
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
