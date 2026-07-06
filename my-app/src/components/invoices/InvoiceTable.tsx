"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "@/components/shell/icons";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/ui/table";
import { Chip, type ChipColor } from "@/components/ui/chip";
import type { Invoice, InvoiceStatusKind } from "@/lib/mock-data";
import { formatDate, formatRupiah, invoiceStatus } from "@/lib/mock-data";

const ROWS_PER_PAGE = 8;

const STATUS_FILTERS: { value: InvoiceStatusKind | "all"; label: string }[] = [
  { value: "all", label: "All status" },
  { value: "paid", label: "Paid" },
  { value: "awaiting", label: "Waiting for payment" },
  { value: "overdue", label: "Overdue" },
];

const STATUS_CHIP_COLOR: Record<InvoiceStatusKind, ChipColor> = {
  paid: "success",
  awaiting: "gray",
  overdue: "error",
};

function downloadCsv(rows: Invoice[]) {
  const header = [
    "Invoice",
    "Client",
    "Project",
    "Amount (IDR)",
    "Status",
    "Issued",
    "Due",
  ];
  const lines = rows.map((invoice) => {
    const status = invoiceStatus(invoice);
    return [
      invoice.number,
      invoice.client,
      invoice.project,
      String(invoice.amount),
      status.label,
      invoice.issuedDate,
      invoice.dueDate,
    ]
      .map((cell) => `"${cell.replace(/"/g, '""')}"`)
      .join(",");
  });
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "invoices-june-2026.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function InvoiceTable({
  invoices,
  canWrite = false,
}: {
  invoices: Invoice[];
  /** Shows add/edit affordances; only passed for roles with `invoices.write`. */
  canWrite?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusKind | "all">(
    "all",
  );
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesSearch =
        q === "" ||
        invoice.client.toLowerCase().includes(q) ||
        invoice.number.toLowerCase().includes(q) ||
        invoice.project.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" || invoiceStatus(invoice).kind === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE,
  );

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateStatusFilter(value: InvoiceStatusKind | "all") {
    setStatusFilter(value);
    setPage(1);
  }

  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-card-border px-3 py-2 text-sm text-ink-muted focus-within:border-primary-300">
          <SearchIcon className="size-4 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Search by client, invoice number, or project…"
            className="w-full bg-transparent text-foreground outline-none placeholder:text-ink-muted"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) =>
            updateStatusFilter(e.target.value as InvoiceStatusKind | "all")
          }
          className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm font-medium text-title"
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => downloadCsv(filtered)}
          className="rounded-lg border border-card-border px-3 py-2 text-sm font-medium text-title hover:bg-soft"
        >
          Export CSV
        </button>
        {canWrite && (
          <button
            type="button"
            onClick={() =>
              setNotice(
                "Adding invoices arrives when the backend is connected — this preview shows who will see this button.",
              )
            }
            className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            New invoice
          </button>
        )}
      </div>

      {notice && (
        <div className="mt-3 flex items-start justify-between gap-3 rounded-lg bg-soft px-3 py-2 text-sm text-ink-secondary">
          <p>{notice}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="shrink-0 text-xs font-medium text-primary-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-4">
        <TableRoot>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Due</TableHead>
              {canWrite && <TableHead className="sr-only">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canWrite ? 7 : 6} className="py-8 text-center">
                  No invoices match your search.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((invoice) => {
                const status = invoiceStatus(invoice);
                return (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <p className="font-medium text-title">{invoice.client}</p>
                      <p className="text-xs text-ink-muted">{invoice.number}</p>
                    </TableCell>
                    <TableCell>{invoice.project}</TableCell>
                    <TableCell className="text-right font-semibold text-title tabular-nums">
                      {formatRupiah(invoice.amount)}
                    </TableCell>
                    <TableCell>
                      <Chip color={STATUS_CHIP_COLOR[status.kind]}>
                        {status.label}
                      </Chip>
                    </TableCell>
                    <TableCell>{formatDate(invoice.issuedDate)}</TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    {canWrite && (
                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setNotice(
                              `Editing ${invoice.number} arrives when the backend is connected — this preview shows who will see this button.`,
                            )
                          }
                          className="rounded-md px-2 py-0.5 text-xs font-medium text-primary-700 hover:bg-primary-50"
                        >
                          Edit
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </TableRoot>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-secondary">
          {filtered.length === 0
            ? "0 invoices"
            : `Showing ${(currentPage - 1) * ROWS_PER_PAGE + 1}–${Math.min(
                currentPage * ROWS_PER_PAGE,
                filtered.length,
              )} of ${filtered.length} invoices`}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-card-border px-3 py-1.5 text-sm font-medium text-title disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              aria-current={n === currentPage ? "page" : undefined}
              className={`size-8 rounded-lg text-sm font-medium ${
                n === currentPage
                  ? "bg-primary-600 text-white"
                  : "text-title hover:bg-soft"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={currentPage === pageCount}
            className="rounded-lg border border-card-border px-3 py-1.5 text-sm font-medium text-title disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
