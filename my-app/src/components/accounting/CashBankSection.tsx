import SectionCard from "@/components/ui/section-card";
import { getCashFlow } from "@/lib/api";
import { cashFlowRangeBounds, type CashFlowRange } from "@/lib/accounting-period";
import { formatRupiahExact } from "@/lib/format";
import CashFlowChart from "./CashFlowChart";
import RangeSelect from "./RangeSelect";

export default async function CashBankSection({
  range,
  basePath,
}: {
  range: CashFlowRange;
  basePath: string;
}) {
  const { from, to, granularity } = cashFlowRangeBounds(range);
  const cashFlow = await getCashFlow(from, to, granularity);
  const hasMovement = cashFlow.totalInflow > 0 || cashFlow.totalOutflow > 0;

  return (
    <SectionCard
      title="Cash & Bank"
      question="How is our cash position moving, and where is it headed?"
      action={<RangeSelect range={range} basePath={basePath} />}
    >
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-soft p-3">
          <dt className="text-xs text-ink-secondary">Opening</dt>
          <dd className="mt-1 text-lg font-semibold text-title tabular-nums">{formatRupiahExact(cashFlow.openingCash)}</dd>
        </div>
        <div className="rounded-xl bg-soft p-3">
          <dt className="text-xs text-ink-secondary">Inflow</dt>
          <dd className="mt-1 text-lg font-semibold text-delta-up tabular-nums">{formatRupiahExact(cashFlow.totalInflow)}</dd>
        </div>
        <div className="rounded-xl bg-soft p-3">
          <dt className="text-xs text-ink-secondary">Outflow</dt>
          <dd className="mt-1 text-lg font-semibold text-delta-down tabular-nums">{formatRupiahExact(cashFlow.totalOutflow)}</dd>
        </div>
        <div className="rounded-xl bg-soft p-3">
          <dt className="text-xs text-ink-secondary">Closing</dt>
          <dd className="mt-1 text-lg font-semibold text-title tabular-nums">{formatRupiahExact(cashFlow.closingCash)}</dd>
        </div>
      </dl>

      <div className="mt-5">
        {hasMovement ? (
          <CashFlowChart buckets={cashFlow.buckets} />
        ) : (
          <p className="py-10 text-center text-sm text-ink-secondary">No cash movement in this range.</p>
        )}
      </div>
    </SectionCard>
  );
}
