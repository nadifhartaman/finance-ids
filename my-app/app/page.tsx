import ChartPlaceholder from "@/app/components/dashboard/ChartPlaceholder";
import HeroCard from "@/app/components/dashboard/HeroCard";
import NeedsAttention from "@/app/components/dashboard/NeedsAttention";
import SectionCard from "@/app/components/dashboard/SectionCard";
import StatCard from "@/app/components/dashboard/StatCard";
import UnpaidInvoices from "@/app/components/dashboard/UnpaidInvoices";
import { Chip } from "@/app/components/ui/chip";
import {
  asOf,
  attentionItems,
  formatRupiah,
  headlineStats,
  period,
  projectStats,
  totalUnpaid,
  unpaidInvoices,
} from "@/app/lib/mock-data";

export default function Home() {
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
        <Chip color="primary" dot={false}>
          Layout preview — all numbers are dummy data
        </Chip>
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
            <span className="rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-ink-secondary">
              Monthly ⌄
            </span>
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
        >
          <UnpaidInvoices invoices={unpaidInvoices} />
        </SectionCard>

        <SectionCard
          title="Money going out"
          question="Are we spending more or less than planned?"
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

      <footer className="mt-8 text-center text-xs text-ink-muted">
        Every number on this page is placeholder data for layout review — no
        real financial data is connected yet.
      </footer>
    </>
  );
}
