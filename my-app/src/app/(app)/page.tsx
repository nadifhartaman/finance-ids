import { Suspense } from "react";
import Link from "next/link";
import BudgetOverview from "@/components/dashboard/BudgetOverview";
import DashboardNotes from "@/components/dashboard/DashboardNotes";
import HeroCard from "@/components/dashboard/HeroCard";
import StatCard from "@/components/dashboard/StatCard";
import UnpaidInvoices from "@/components/dashboard/UnpaidInvoices";
import CashBankSection from "@/components/accounting/CashBankSection";
import NeedsAttentionSection from "@/components/accounting/NeedsAttentionSection";
import SectionBoundary from "@/components/accounting/SectionBoundary";
import SectionSkeleton from "@/components/accounting/SectionSkeleton";
import SectionCard from "@/components/ui/section-card";
import { Chip } from "@/components/ui/chip";
import { getRequiredUser } from "@/lib/auth";
import { getBudgets, getDashboard, getDebt, getNotes } from "@/lib/api";
import { isCashFlowRange, type CashFlowRange } from "@/lib/accounting-period";
import { formatRupiah } from "@/lib/format";
import { can } from "@/lib/roles";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range: CashFlowRange = isCashFlowRange(rangeParam) ? rangeParam : "30d";

  const [user, dashboard, { notes }, { totals: budgetTotals, categoryBudgets }, { loans }] =
    await Promise.all([
      getRequiredUser(),
      getDashboard(),
      getNotes(),
      getBudgets(),
      getDebt("active"),
    ]);
  const { asOf, period, headlineStats, totalUnpaid, unpaidInvoices, projectStats } = dashboard;
  const cash = headlineStats.find((s) => s.id === "cash")!;
  const kpis = headlineStats.filter((s) => s.id !== "cash");
  const outstandingDebt = loans.reduce((sum, l) => sum + l.outstandingPrincipal, 0);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-title">
            Financial health
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {period} · updated {asOf}
          </p>
        </div>
      </header>

      {/* The 3 headline numbers the Director reads first; cash is the hero */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
        <HeroCard stat={cash} />
      </div>

      <div className="mt-4">
        <SectionBoundary title="Needs attention">
          <Suspense fallback={<SectionSkeleton className="h-40" />}>
            <NeedsAttentionSection />
          </Suspense>
        </SectionBoundary>
      </div>

      <div className="mt-4">
        <SectionBoundary title="Cash & Bank">
          <Suspense fallback={<SectionSkeleton />}>
            <CashBankSection range={range} basePath="/" />
          </Suspense>
        </SectionBoundary>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Money owed to us"
          question={`Clients owe us ${formatRupiah(totalUnpaid)} in unpaid invoices — who should we chase?`}
          action={
            <Link
              href="/money-in"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              See all →
            </Link>
          }
        >
          <UnpaidInvoices invoices={unpaidInvoices} />
        </SectionCard>

        <SectionCard
          title="Money going out"
          question="Are we spending more or less than planned?"
          action={
            <Link
              href="/money-out"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              See all →
            </Link>
          }
        >
          <BudgetOverview totals={budgetTotals} categoryBudgets={categoryBudgets} />
        </SectionCard>

        <SectionCard
          title="Projects"
          question="Is project work healthy, and what is close to being billable?"
          action={
            <Link
              href="/projects"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              See all →
            </Link>
          }
        >
          <dl className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-soft p-3">
              <dt className="text-xs text-ink-secondary">Active projects</dt>
              <dd className="mt-1 text-2xl font-semibold text-title">
                {projectStats.active}
              </dd>
            </div>
            <div className="rounded-xl bg-soft p-3">
              <dt className="text-xs text-ink-secondary">Close to billing</dt>
              <dd className="mt-1 text-2xl font-semibold text-title">
                {projectStats.nearBilling}
              </dd>
            </div>
            <div className="rounded-xl bg-soft p-3">
              <dt className="text-xs text-ink-secondary">Over budget</dt>
              <dd className="mt-1 text-2xl font-semibold text-title">
                {projectStats.overBudget}
              </dd>
            </div>
          </dl>
          <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-title">
            <Chip color="error">Over budget</Chip>
            <span className="font-medium">{projectStats.flaggedProject}</span> —
            see &ldquo;Needs attention&rdquo; above.
          </p>
          <p className="mt-3 border-t border-card-border pt-3 text-sm text-ink-secondary">
            Signed work not yet billed:{" "}
            <span className="font-semibold text-title">
              {formatRupiah(projectStats.pipelineValue)}
            </span>
          </p>
        </SectionCard>

        <SectionCard
          title="Debt"
          question="How much do we still owe lenders?"
          action={
            <Link
              href="/debt"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              See all →
            </Link>
          }
        >
          <p className="text-3xl font-semibold tracking-tight text-title tabular-nums">
            {formatRupiah(outstandingDebt)}
          </p>
          <p className="mt-2 text-sm text-ink-secondary">
            Outstanding principal across {loans.length} active loan{loans.length === 1 ? "" : "s"}.
          </p>
        </SectionCard>
      </div>

      <div className="mt-4">
        <SectionCard
          title="Notes"
          question="Any context worth remembering about this month's numbers?"
        >
          <DashboardNotes notes={notes} canWrite={can(user.role, "notes.write")} />
        </SectionCard>
      </div>
    </>
  );
}
