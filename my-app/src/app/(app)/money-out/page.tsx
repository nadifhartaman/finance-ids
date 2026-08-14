import { Suspense } from "react";
import Link from "next/link";
import BudgetInsights from "@/components/budgets/BudgetInsights";
import BudgetList from "@/components/budgets/BudgetList";
import BudgetProgressRing from "@/components/budgets/BudgetProgressRing";
import BudgetScopeSelect from "@/components/budgets/BudgetScopeSelect";
import MoneyOutKpiRow from "@/components/money-out/MoneyOutKpiRow";
import PayablesSection from "@/components/accounting/PayablesSection";
import SectionBoundary from "@/components/accounting/SectionBoundary";
import SectionSkeleton from "@/components/accounting/SectionSkeleton";
import { getRequiredUser } from "@/lib/auth";
import { getBudgets, getExpenses } from "@/lib/api";
import { scopeToRange } from "@/lib/accounting-period";
import { can } from "@/lib/roles";
import { APP_ROUTES } from "@/lib/routes";
import type { ExpenseCategory } from "@/lib/types";

export default async function MoneyOutPage({
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

  const [user, budgets, { data: draftExpenses }] = await Promise.all([
    getRequiredUser(),
    getBudgets(requestedScope),
    getExpenses({ status: "draft" }),
  ]);
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

  const draftCount: Record<ExpenseCategory, number> = { payroll: 0, operations: 0, project_costs: 0 };
  for (const e of draftExpenses) draftCount[e.category]++;

  // Category plans can only be edited for the month being planned (the
  // current one); project budgets are whole-project, edited in All time.
  const canEditCategories = canEdit && scope.isCurrent;
  const canEditProjects = canEdit && scope.kind === "all";
  const range = scopeToRange(scope);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-title">
            Money Out
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Where our money goes.
          </p>
        </div>
        <BudgetScopeSelect scope={scope} months={availableMonths} />
      </header>

      <div className="mt-6">
        <Suspense fallback={<SectionSkeleton className="h-28" />}>
          <MoneyOutKpiRow range={range} />
        </Suspense>
      </div>

      <section className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-title">
            Money out by type — {scope.label}
          </h2>
          <Link
            href={APP_ROUTES.expenses}
            className="text-sm font-medium text-primary-700 hover:underline"
          >
            All expenses →
          </Link>
        </div>
        <div className="mt-3">
          <BudgetList
            items={categoryBudgets}
            canEdit={canEditCategories}
            kind="category"
            layout="grid"
            noPlanHint={scope.kind === "month" ? "No plan set" : undefined}
            linkToExpenses
            draftCounts={draftCount}
          />
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <BudgetProgressRing totals={totals} scope={scope} />
          <BudgetInsights insights={budgetInsights} />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="text-lg font-semibold text-title">
              {scope.kind === "all"
                ? "Project costs — whole project"
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

          <SectionBoundary title="Who we owe">
            <Suspense fallback={<SectionSkeleton />}>
              <PayablesSection asOf={range.end} />
            </Suspense>
          </SectionBoundary>
        </div>
      </div>
    </>
  );
}
