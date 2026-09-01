import RangeSelect from "@/components/accounting/RangeSelect";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/ui/table";
import { getCashFlow, getGeneralLedger } from "@/lib/api";
import { cashFlowRangeBounds, isCashFlowRange, type CashFlowRange } from "@/lib/accounting-period";
import { formatDate, formatRupiahExact } from "@/lib/format";
import { APP_ROUTES } from "@/lib/routes";

const DEFAULT_RANGE: CashFlowRange = "30d";

export default async function CashFlowStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range = isCashFlowRange(rangeParam) ? rangeParam : DEFAULT_RANGE;
  const { from, to, granularity } = cashFlowRangeBounds(range);

  const [summary, ledger] = await Promise.all([
    getCashFlow(from, to, granularity),
    getGeneralLedger({ from, to, accountSubtypes: ["bank", "cash"] }),
  ]);

  let running = summary.openingCash;
  const rows = ledger.lines.map((line) => {
    running += line.debit - line.credit;
    return { ...line, balance: running };
  });

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-title">Cash flow statement</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Cash movement from {from} to {to}, with a running balance.
          </p>
        </div>
        <RangeSelect range={range} basePath={APP_ROUTES.cashFlowStatement} />
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl bg-soft p-3">
          <dt className="text-xs text-ink-secondary">Opening cash</dt>
          <dd className="mt-1 text-lg font-semibold text-title tabular-nums">{formatRupiahExact(summary.openingCash)}</dd>
        </div>
        <div className="rounded-xl bg-soft p-3">
          <dt className="text-xs text-ink-secondary">Cash in</dt>
          <dd className="mt-1 text-lg font-semibold text-delta-up tabular-nums">{formatRupiahExact(summary.totalInflow)}</dd>
        </div>
        <div className="rounded-xl bg-soft p-3">
          <dt className="text-xs text-ink-secondary">Cash out</dt>
          <dd className="mt-1 text-lg font-semibold text-delta-down tabular-nums">{formatRupiahExact(summary.totalOutflow)}</dd>
        </div>
        <div className="rounded-xl bg-soft p-3">
          <dt className="text-xs text-ink-secondary">Net movement</dt>
          <dd className="mt-1 text-lg font-semibold text-title tabular-nums">{formatRupiahExact(summary.netMovement)}</dd>
        </div>
        <div className="rounded-xl bg-soft p-3">
          <dt className="text-xs text-ink-secondary">Closing cash</dt>
          <dd className="mt-1 text-lg font-semibold text-title tabular-nums">{formatRupiahExact(summary.closingCash)}</dd>
        </div>
      </dl>

      <div className="mt-6">
        <TableRoot>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Cash in (Rp)</TableHead>
              <TableHead className="text-right">Cash out (Rp)</TableHead>
              <TableHead className="text-right">Balance (Rp)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell className="text-ink-muted italic" colSpan={5}>
                  No cash movement in this range.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.lineId}>
                <TableCell>{formatDate(r.accountingDate)}</TableCell>
                <TableCell>{r.description ?? r.accountName}</TableCell>
                <TableCell className="text-right">{r.debit > 0 ? formatRupiahExact(r.debit) : "—"}</TableCell>
                <TableCell className="text-right">{r.credit > 0 ? formatRupiahExact(r.credit) : "—"}</TableCell>
                <TableCell className="text-right font-medium text-title">{formatRupiahExact(r.balance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableRoot>
      </div>
    </>
  );
}
