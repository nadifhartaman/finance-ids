import { Suspense } from "react";
import BudgetList from "@/components/budgets/BudgetList";
import BudgetProgressRing from "@/components/budgets/BudgetProgressRing";
import BudgetScopeSelect from "@/components/budgets/BudgetScopeSelect";
import MoneyOutKpiRow from "@/components/money-out/MoneyOutKpiRow";
import RecentExpenses from "@/components/money-out/RecentExpenses";
import PayablesSection from "@/components/accounting/PayablesSection";
import SectionBoundary from "@/components/accounting/SectionBoundary";
import SectionSkeleton from "@/components/accounting/SectionSkeleton";
import { getRequiredUser } from "@/lib/auth";
import { getBudgets, getExpenses } from "@/lib/api";
import { scopeToRange } from "@/lib/accounting-period";
import { can } from "@/lib/roles";

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

  const [user, budgets, { data: expenses }] = await Promise.all([
    getRequiredUser(),
    getBudgets(requestedScope),
    getExpenses(),
  ]);
  const canEdit = can(user.role, "budgets.edit");
  const canWriteExpenses = can(user.role, "spending.write");
  const { scope, availableMonths, categoryBudgets, totals } = budgets;

  // Category plans can only be edited for the month being planned (the current one).
  const canEditCategories = canEdit && scope.isCurrent;
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
        <h2 className="text-lg font-semibold text-title">
          Money out by type — {scope.label}
        </h2>
        <div className="mt-3">
          <BudgetList
            items={categoryBudgets}
            canEdit={canEditCategories}
            kind="category"
            layout="strip"
            noPlanHint={scope.kind === "month" ? "No plan set" : undefined}
          />
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <BudgetProgressRing totals={totals} scope={scope} />
        </div>

        <div className="lg:col-span-2">
          <SectionBoundary title="Unpaid bills">
            <Suspense fallback={<SectionSkeleton />}>
              <PayablesSection asOf={range.end} />
            </Suspense>
          </SectionBoundary>
        </div>
      </div>

      <div className="mt-6">
        <RecentExpenses expenses={expenses} canWrite={canWriteExpenses} />
      </div>
    </>
  );
}
