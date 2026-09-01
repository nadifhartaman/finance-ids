import Link from "next/link";
import JournalPager from "@/components/reports/JournalPager";
import { Chip, type ChipColor } from "@/components/ui/chip";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/ui/table";
import { getJournalEntries } from "@/lib/api";
import { formatDate, formatRupiahExact } from "@/lib/format";
import { APP_ROUTES, journalEntryRoute } from "@/lib/routes";
import type { JournalEntryStatus } from "@/lib/types";

const LIMIT = 25;

const STATUS_COLOR: Record<string, ChipColor> = {
  posted: "success",
  draft: "primary",
  cancelled: "gray",
};

function resolveStatus(value?: string): JournalEntryStatus | undefined {
  return value === "draft" || value === "posted" || value === "cancelled" ? value : undefined;
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; from?: string; to?: string; journalCode?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = resolveStatus(params.status);
  const { data, total } = await getJournalEntries({
    page,
    limit: LIMIT,
    from: params.from,
    to: params.to,
    journalCode: params.journalCode,
    status,
  });

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-title">General journal</h1>
        <p className="mt-1 text-sm text-ink-secondary">Every posted transaction, debit and credit, in order.</p>
      </header>

      <div className="mt-6">
        <TableRoot>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Entry #</TableHead>
              <TableHead>Journal</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount (Rp)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell className="text-ink-muted italic" colSpan={6}>
                  No journal entries found.
                </TableCell>
              </TableRow>
            )}
            {data.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{formatDate(entry.accountingDate)}</TableCell>
                <TableCell>
                  <Link href={journalEntryRoute(entry.id)} className="font-medium text-primary-600 hover:underline">
                    {entry.entryNumber}
                  </Link>
                </TableCell>
                <TableCell>{entry.journalName}</TableCell>
                <TableCell>{entry.description}</TableCell>
                <TableCell className="text-right">{formatRupiahExact(entry.amount)}</TableCell>
                <TableCell>
                  <Chip color={STATUS_COLOR[entry.status] ?? "gray"}>{entry.status}</Chip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableRoot>

        <JournalPager
          page={page}
          limit={LIMIT}
          total={total}
          basePath={APP_ROUTES.journal}
          query={{ from: params.from, to: params.to, journalCode: params.journalCode, status: params.status }}
        />
      </div>
    </>
  );
}
