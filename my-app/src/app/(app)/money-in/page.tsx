import { Suspense } from "react";
import ClientTypeChart from "@/components/trends/ClientTypeChart";
import ProductLineDonut from "@/components/trends/ProductLineDonut";
import RevenueTargetEditor from "@/components/trends/RevenueTargetEditor";
import RevenueTrendChart from "@/components/trends/RevenueTrendChart";
import InvoiceSummaryCards from "@/components/invoices/InvoiceSummaryCards";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import MoneyInKpiRow from "@/components/money-in/MoneyInKpiRow";
import ReceivablesSection from "@/components/accounting/ReceivablesSection";
import PeriodSelect from "@/components/accounting/PeriodSelect";
import SectionBoundary from "@/components/accounting/SectionBoundary";
import SectionSkeleton from "@/components/accounting/SectionSkeleton";
import SectionCard from "@/components/ui/section-card";
import { getRequiredUser } from "@/lib/auth";
import { getInvoices, getTrends } from "@/lib/api";
import { resolveAccountingPeriod } from "@/lib/accounting-period";
import { can } from "@/lib/roles";

export default async function MoneyInPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const periodInfo = resolveAccountingPeriod(period);

  const [user, { invoices, summary }, trends] = await Promise.all([
    getRequiredUser(),
    getInvoices(),
    getTrends(),
  ]);
  const canWrite = can(user.role, "invoices.write");

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-title">
            Money In
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Where our money comes from.
          </p>
        </div>
        <PeriodSelect period={periodInfo.period} basePath="/money-in" />
      </header>

      <div className="mt-6">
        <Suspense fallback={<SectionSkeleton className="h-28" />}>
          <MoneyInKpiRow periodInfo={periodInfo} />
        </Suspense>
      </div>

      <div className="mt-4">
        <SectionCard
          title="Revenue vs target"
          question="Are we on track to hit this year's revenue target?"
          action={
            can(user.role, "targets.edit") ? (
              <RevenueTargetEditor
                currentPeriod={trends.currentPeriod}
                currentTarget={trends.currentTarget}
              />
            ) : undefined
          }
        >
          <RevenueTrendChart data={trends.monthlyRevenue} />
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Government vs private clients"
          question="Which type of client brings in more revenue?"
        >
          <ClientTypeChart data={trends.revenueByClientType} />
        </SectionCard>

        <SectionCard
          title="Revenue by product line"
          question="Which product line is driving the most revenue?"
        >
          <ProductLineDonut data={trends.revenueByProductLine} />
        </SectionCard>
      </div>

      <div className="mt-4">
        <SectionBoundary title="Who owes us money">
          <Suspense fallback={<SectionSkeleton />}>
            <ReceivablesSection asOf={periodInfo.end} />
          </Suspense>
        </SectionBoundary>
      </div>

      <div className="mt-6">
        <InvoiceSummaryCards summary={summary} />
      </div>

      <div className="mt-4">
        <InvoiceTable invoices={invoices} canWrite={canWrite} />
      </div>
    </>
  );
}
