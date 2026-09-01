import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/ui/table";
import { formatRupiahExact } from "@/lib/format";

export interface StatementLine {
  code?: string;
  label: string;
  amount: number;
}

export interface StatementSection {
  title: string;
  lines: StatementLine[];
  /** Section subtotal, shown as a bold row under the lines. */
  total: number;
  totalLabel: string;
}

/**
 * Shared shape for the Income Statement and Balance Sheet: a list of
 * sections, each a header + account lines + a subtotal row, ending in an
 * optional grand total and a "must be zero" balance check — the workbook's
 * `Selisih (harus 0 = balance)` row. One component so the two pages can't
 * drift on formatting or on how the balance check renders. The Trial
 * Balance is a genuinely different shape (separate Debit/Credit columns,
 * not a signed Amount) — see TrialBalanceTable.tsx.
 */
export default function StatementTable({
  sections,
  grandTotal,
  balanceCheck,
}: {
  sections: StatementSection[];
  grandTotal?: { label: string; amount: number };
  balanceCheck?: { label: string; amount: number };
}) {
  return (
    <TableRoot>
      <TableHeader>
        <TableRow>
          <TableHead>Account</TableHead>
          <TableHead className="text-right">Amount (Rp)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sections.map((section) => (
          <SectionRows key={section.title} section={section} />
        ))}
        {grandTotal && (
          <TableRow className="bg-soft font-semibold text-title">
            <TableCell className="font-semibold text-title">{grandTotal.label}</TableCell>
            <TableCell className="text-right font-semibold text-title">
              {formatRupiahExact(grandTotal.amount)}
            </TableCell>
          </TableRow>
        )}
        {balanceCheck && (
          <TableRow>
            <TableCell className="text-ink-muted">{balanceCheck.label}</TableCell>
            <TableCell
              className={`text-right font-medium ${balanceCheck.amount === 0 ? "text-chip-success-text" : "text-chip-error-text"}`}
            >
              {formatRupiahExact(balanceCheck.amount)}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </TableRoot>
  );
}

function SectionRows({ section }: { section: StatementSection }) {
  return (
    <>
      <TableRow>
        <TableCell className="bg-soft font-semibold text-title" colSpan={2}>
          {section.title}
        </TableCell>
      </TableRow>
      {section.lines.length === 0 && (
        <TableRow>
          <TableCell className="text-ink-muted italic" colSpan={2}>
            No activity
          </TableCell>
        </TableRow>
      )}
      {section.lines.map((line) => (
        <TableRow key={`${section.title}-${line.code ?? line.label}`}>
          <TableCell>
            {line.code && <span className="mr-2 text-xs text-ink-muted">{line.code}</span>}
            {line.label}
          </TableCell>
          <TableCell className="text-right">{formatRupiahExact(line.amount)}</TableCell>
        </TableRow>
      ))}
      <TableRow className="font-medium text-title">
        <TableCell className="font-medium text-title">{section.totalLabel}</TableCell>
        <TableCell className="text-right font-medium text-title">{formatRupiahExact(section.total)}</TableCell>
      </TableRow>
    </>
  );
}
