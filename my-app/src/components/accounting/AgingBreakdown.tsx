"use client";

import { useState } from "react";
import { TableBody, TableCell, TableHead, TableHeader, TableRoot, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { formatRupiahExact } from "@/lib/format";
import type { AgingBucket, PartnerAgingRow } from "@/lib/types";

const BUCKET_LABEL: Record<AgingBucket["label"], string> = {
  current: "Current",
  "1-30": "1–30 days",
  "31-60": "31–60 days",
  "61-90": "61–90 days",
  "90+": "90+ days",
};

const ROWS_PER_PAGE = 5;

/** Shared presentation for AR/AP aging: bucket totals + a paginated partner table. Used by Receivables and Payables — both are the same shape (AgingResponse), just different partner roles. */
export default function AgingBreakdown({
  buckets,
  partners,
  partnerLabel,
  emptyLabel,
}: {
  buckets: AgingBucket[];
  partners: PartnerAgingRow[];
  partnerLabel: string;
  emptyLabel: string;
}) {
  const [page, setPage] = useState(1);
  const total = buckets.reduce((sum, b) => sum + b.amount, 0);

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-ink-secondary">{emptyLabel}</p>;
  }

  const pageCount = Math.max(1, Math.ceil(partners.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = partners.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE,
  );

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {buckets.map((b) => (
          <div key={b.label} className={`rounded-xl p-3 ${b.label === "90+" && b.amount > 0 ? "bg-chip-error-bg" : "bg-soft"}`}>
            <dt className="text-xs text-ink-secondary">{BUCKET_LABEL[b.label]}</dt>
            <dd
              className={`mt-1 text-sm font-semibold tabular-nums ${
                b.label === "90+" && b.amount > 0 ? "text-chip-error-text" : "text-title"
              }`}
            >
              {formatRupiahExact(b.amount)}
            </dd>
          </div>
        ))}
      </dl>

      {partners.length > 0 && (
        <div className="mt-5">
          <TableRoot>
            <TableHeader>
              <TableRow>
                <TableHead>{partnerLabel}</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">90+ days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((p) => (
                <TableRow key={p.partnerId}>
                  <TableCell className="font-medium text-title">{p.partnerName}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatRupiahExact(p.total)}</TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${p.d90plus > 0 ? "text-chip-error-text font-medium" : ""}`}
                  >
                    {formatRupiahExact(p.d90plus)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableRoot>
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            total={partners.length}
            pageSize={ROWS_PER_PAGE}
            itemLabel={`${partnerLabel.toLowerCase()}s`}
            onPageChange={setPage}
          />
        </div>
      )}
    </>
  );
}
