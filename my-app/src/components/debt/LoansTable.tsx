import { TableBody, TableCell, TableHead, TableHeader, TableRoot, TableRow } from "@/components/ui/table";
import { Chip } from "@/components/ui/chip";
import { formatDate, formatRupiahExact } from "@/lib/format";
import type { DebtOutstandingRow } from "@/lib/types";

/** maturityDate is the loan's contractual due date, not a repayment schedule — the debt report has no repayment-plan history, so this is labelled "Maturity", never framed as an upcoming-payments plan. */
function isMaturingSoon(maturityDate: string | null): boolean {
  if (!maturityDate) return false;
  const days = (new Date(`${maturityDate}T00:00:00Z`).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 30;
}

export default function LoansTable({ loans }: { loans: DebtOutstandingRow[] }) {
  if (loans.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-secondary">No loans in this status.</p>;
  }

  return (
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
        </TableRow>
      </TableHeader>
      <TableBody>
        {loans.map((loan) => (
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
          </TableRow>
        ))}
      </TableBody>
    </TableRoot>
  );
}
