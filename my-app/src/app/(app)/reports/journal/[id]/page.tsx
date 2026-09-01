import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip, type ChipColor } from "@/components/ui/chip";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/ui/table";
import { getJournalEntry } from "@/lib/api";
import { formatDate, formatRupiahExact } from "@/lib/format";
import { APP_ROUTES } from "@/lib/routes";

const STATUS_COLOR: Record<string, ChipColor> = {
  posted: "success",
  draft: "primary",
  cancelled: "gray",
};

export default async function JournalEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let entry;
  try {
    entry = await getJournalEntry(id);
  } catch {
    notFound();
  }

  const totalDebit = entry.lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = entry.lines.reduce((sum, l) => sum + l.credit, 0);

  return (
    <>
      <Link href={APP_ROUTES.journal} className="text-sm font-medium text-primary-600 hover:underline">
        ← General journal
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-title">{entry.entryNumber}</h1>
          <p className="mt-1 text-sm text-ink-secondary">{entry.description}</p>
        </div>
        <Chip color={STATUS_COLOR[entry.status] ?? "gray"}>{entry.status}</Chip>
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-card-border bg-card p-5 shadow-xs sm:grid-cols-4">
        <div>
          <dt className="text-xs text-ink-secondary">Date</dt>
          <dd className="mt-1 text-sm font-medium text-title">{formatDate(entry.accountingDate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-secondary">Journal</dt>
          <dd className="mt-1 text-sm font-medium text-title">{entry.journalName}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-secondary">Reference</dt>
          <dd className="mt-1 text-sm font-medium text-title">{entry.reference ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-secondary">Source</dt>
          <dd className="mt-1 text-sm font-medium text-title">{entry.sourceType}</dd>
        </div>
      </dl>

      <div className="mt-6">
        <TableRoot>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Debit (Rp)</TableHead>
              <TableHead className="text-right">Credit (Rp)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entry.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>
                  <span className="mr-2 text-xs text-ink-muted">{line.accountCode}</span>
                  {line.accountName}
                </TableCell>
                <TableCell>{line.partnerName ?? "—"}</TableCell>
                <TableCell>{line.projectName ?? "—"}</TableCell>
                <TableCell>{line.description ?? "—"}</TableCell>
                <TableCell className="text-right">{line.debit > 0 ? formatRupiahExact(line.debit) : "—"}</TableCell>
                <TableCell className="text-right">{line.credit > 0 ? formatRupiahExact(line.credit) : "—"}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-soft font-semibold text-title">
              <TableCell className="font-semibold text-title" colSpan={4}>
                TOTAL
              </TableCell>
              <TableCell className="text-right font-semibold text-title">{formatRupiahExact(totalDebit)}</TableCell>
              <TableCell className="text-right font-semibold text-title">{formatRupiahExact(totalCredit)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-ink-muted" colSpan={4}>
                Difference (must be 0)
              </TableCell>
              <TableCell
                className={`text-right font-medium ${totalDebit === totalCredit ? "text-chip-success-text" : "text-chip-error-text"}`}
                colSpan={2}
              >
                {formatRupiahExact(totalDebit - totalCredit)}
              </TableCell>
            </TableRow>
          </TableBody>
        </TableRoot>
      </div>
    </>
  );
}
