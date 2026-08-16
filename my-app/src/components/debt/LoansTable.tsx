"use client";

import { useState } from "react";
import { TableBody, TableCell, TableHead, TableHeader, TableRoot, TableRow } from "@/components/ui/table";
import { Chip } from "@/components/ui/chip";
import { Pagination } from "@/components/ui/pagination";
import RecordRepaymentDialog from "./RecordRepaymentDialog";
import { formatDate, formatRupiahExact } from "@/lib/format";
import type { DebtOutstandingRow } from "@/lib/types";

const ROWS_PER_PAGE = 5;

/** maturityDate is the loan's contractual due date, not a repayment schedule — the debt report has no repayment-plan history, so this is labelled "Maturity", never framed as an upcoming-payments plan. */
function isMaturingSoon(maturityDate: string | null): boolean {
  if (!maturityDate) return false;
  const days = (new Date(`${maturityDate}T00:00:00Z`).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 30;
}

export default function LoansTable({
  loans,
  canWrite = false,
}: {
  loans: DebtOutstandingRow[];
  canWrite?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [repaymentTarget, setRepaymentTarget] = useState<DebtOutstandingRow | null>(null);

  if (loans.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-secondary">No loans in this status.</p>;
  }

  const pageCount = Math.max(1, Math.ceil(loans.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = loans.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE,
  );

  return (
    <>
      <TableRoot>
        <TableHeader>
          <TableRow>
            <TableHead>Loan</TableHead>
            <TableHead>Lender</TableHead>
            <TableHead className="text-right">Principal</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
            <TableHead className="text-right">Interest paid</TableHead>
            <TableHead>Maturity</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead className="sr-only">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.map((loan) => (
            <TableRow key={loan.loanId}>
              <TableCell className="font-medium text-title">{loan.reference}</TableCell>
              <TableCell>{loan.lenderName}</TableCell>
              <TableCell className="text-right tabular-nums">{formatRupiahExact(loan.principalAmount)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatRupiahExact(loan.outstandingPrincipal)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatRupiahExact(loan.interestPaid)}</TableCell>
              <TableCell>
                {loan.maturityDate ? (
                  <span className="inline-flex items-center gap-1.5">
                    {formatDate(loan.maturityDate)}
                    {loan.status === "active" && isMaturingSoon(loan.maturityDate) && (
                      <Chip color="warning">Within 30 days</Chip>
                    )}
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="capitalize">{loan.status}</TableCell>
              {canWrite && (
                <TableCell className="text-right whitespace-nowrap">
                  {loan.status === "active" && (
                    <button
                      type="button"
                      onClick={() => setRepaymentTarget(loan)}
                      className="rounded-md px-2 py-0.5 text-xs font-medium text-primary-700 hover:bg-primary-50"
                    >
                      Record repayment
                    </button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </TableRoot>
      <Pagination
        page={currentPage}
        pageCount={pageCount}
        total={loans.length}
        pageSize={ROWS_PER_PAGE}
        itemLabel="loans"
        onPageChange={setPage}
      />
      {canWrite && repaymentTarget && (
        <RecordRepaymentDialog
          key={repaymentTarget.loanId}
          isOpen={repaymentTarget !== null}
          onOpenChange={(open) => {
            if (!open) setRepaymentTarget(null);
          }}
          loan={repaymentTarget}
        />
      )}
    </>
  );
}
