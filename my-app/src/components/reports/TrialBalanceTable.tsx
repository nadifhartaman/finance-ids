import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/ui/table";
import { formatRupiahExact } from "@/lib/format";
import type { TrialBalanceRow } from "@/lib/types";

/** Debit/Credit columns, matching the workbook's Neraca Saldo sheet — each account's net balance sits in whichever column it naturally carries (fn_trial_balance already zeroes the other side). */
export default function TrialBalanceTable({ accounts }: { accounts: TrialBalanceRow[] }) {
  const totalDebit = accounts.reduce((sum, a) => sum + a.debit, 0);
  const totalCredit = accounts.reduce((sum, a) => sum + a.credit, 0);

  return (
    <TableRoot>
      <TableHeader>
        <TableRow>
          <TableHead>Account</TableHead>
          <TableHead className="text-right">Debit (Rp)</TableHead>
          <TableHead className="text-right">Credit (Rp)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.length === 0 && (
          <TableRow>
            <TableCell className="text-ink-muted italic" colSpan={3}>
              No posted activity yet
            </TableCell>
          </TableRow>
        )}
        {accounts.map((a) => (
          <TableRow key={a.accountId}>
            <TableCell>
              <span className="mr-2 text-xs text-ink-muted">{a.accountCode}</span>
              {a.accountName}
            </TableCell>
            <TableCell className="text-right">{a.debit > 0 ? formatRupiahExact(a.debit) : "—"}</TableCell>
            <TableCell className="text-right">{a.credit > 0 ? formatRupiahExact(a.credit) : "—"}</TableCell>
          </TableRow>
        ))}
        <TableRow className="bg-soft font-semibold text-title">
          <TableCell className="font-semibold text-title">TOTAL</TableCell>
          <TableCell className="text-right font-semibold text-title">{formatRupiahExact(totalDebit)}</TableCell>
          <TableCell className="text-right font-semibold text-title">{formatRupiahExact(totalCredit)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="text-ink-muted">Difference (must be 0)</TableCell>
          <TableCell
            className={`text-right font-medium ${totalDebit === totalCredit ? "text-chip-success-text" : "text-chip-error-text"}`}
            colSpan={2}
          >
            {formatRupiahExact(totalDebit - totalCredit)}
          </TableCell>
        </TableRow>
      </TableBody>
    </TableRoot>
  );
}
