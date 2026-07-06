import Link from "next/link";
import ChartPlaceholder from "@/components/dashboard/ChartPlaceholder";
import HeroCard from "@/components/dashboard/HeroCard";
import NeedsAttention from "@/components/dashboard/NeedsAttention";
import SectionCard from "@/components/ui/section-card";
import StatCard from "@/components/dashboard/StatCard";
import UnpaidInvoices from "@/components/dashboard/UnpaidInvoices";
import { Chip } from "@/components/ui/chip";
import { getDashboard } from "@/lib/api";

export default async function Home() {
  const { asOf, period, headlineStats, attentionItems, totalUnpaid, unpaidInvoices, projectStats } = await getDashboard();
  const cash = headlineStats.find((s) => s.id === "cash")!;
  const kpis = headlineStats.filter((s) => s.id !== "cash");

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
        <NeedsAttention items={attentionItems} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Money coming in"
          question="Are we on track to hit this month's revenue target?"
          action={
            <Link
              href="/trends"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              See all →
            </Link>
          }
        >
          <ChartPlaceholder kind="bars" caption="Revenue vs target, by month" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ChartPlaceholder
              kind="bars"
              caption="Government vs private clients"
            />
            <ChartPlaceholder
              kind="bars"
              caption="By product (VIANA, ORION, AIoT, Indi AI, Digital Twin)"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Money owed to us"
          question={`Clients owe us ${formatRupiah(totalUnpaid)} in unpaid invoices — who should we chase?`}
          action={
            <Link
              href="/invoices"
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
              href="/budgets"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              See all →
            </Link>
          }
        >
          <ChartPlaceholder kind="line" caption="Spending vs plan this month" />
          <div className="mt-4">
            <ChartPlaceholder
              kind="bars"
              caption="By category (payroll, operations, project costs)"
            />
          </div>
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
      </div>

    </>
  );
}
