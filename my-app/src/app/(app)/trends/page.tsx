import ClientTypeChart from "@/components/trends/ClientTypeChart";
import ProductLineDonut from "@/components/trends/ProductLineDonut";
import RevenueTargetEditor from "@/components/trends/RevenueTargetEditor";
import RevenueTrendChart from "@/components/trends/RevenueTrendChart";
import TrendsSummaryCards from "@/components/trends/TrendsSummaryCards";
import SectionCard from "@/components/ui/section-card";
import { getRequiredUser } from "@/lib/auth";
import { getTrends } from "@/lib/api";
import { can } from "@/lib/roles";

export default async function TrendsPage() {
  const [user, trends] = await Promise.all([getRequiredUser(), getTrends()]);
  const {
    monthlyRevenue,
    revenueByClientType,
    revenueByProductLine,
    revenueThisYear,
    yearTargetPct,
    governmentSharePct,
    topProductLine,
    currentPeriod,
    currentTarget,
  } = trends;
  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-title">
          Trends
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          How money coming in is moving over time.
        </p>
      </header>

      <div className="mt-6">
        <TrendsSummaryCards
          revenueThisYear={revenueThisYear}
          yearTargetPct={yearTargetPct}
          governmentSharePct={governmentSharePct}
          topProductLine={topProductLine}
        />
      </div>

      <div className="mt-4">
        <SectionCard
          title="Revenue vs target"
          question="Are we on track to hit this year's revenue target?"
          action={
            can(user.role, "targets.edit") ? (
              <RevenueTargetEditor currentPeriod={currentPeriod} currentTarget={currentTarget} />
            ) : undefined
          }
        >
          <RevenueTrendChart data={monthlyRevenue} />
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Government vs private clients"
          question="Which type of client brings in more revenue?"
        >
          <ClientTypeChart data={revenueByClientType} />
        </SectionCard>

        <SectionCard
          title="Revenue by product line"
          question="Which product line is driving the most revenue?"
        >
          <ProductLineDonut data={revenueByProductLine} />
        </SectionCard>
      </div>
    </>
  );
}
