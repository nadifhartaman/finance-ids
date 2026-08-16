"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/chip";
import { Pagination } from "@/components/ui/pagination";
import type { DashboardUnpaidInvoice } from "@/lib/types";
import { formatRupiah } from "@/lib/format";

const ROWS_PER_PAGE = 5;

export default function UnpaidInvoices({ invoices }: { invoices: DashboardUnpaidInvoice[] }) {
  const [page, setPage] = useState(1);

  if (invoices.length === 0) {
    return <p className="py-3 text-sm text-ink-secondary">No unpaid invoices right now.</p>;
  }

  const pageCount = Math.max(1, Math.ceil(invoices.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = invoices.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE,
  );

  return (
    <div>
      <ul className="divide-y divide-card-border">
        {pageRows.map((invoice) => {
          const status = invoice.status;
          return (
            <li
              key={invoice.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-sm font-medium text-title">{invoice.client}</p>
                <Chip color={status.kind === "overdue" ? "error" : "gray"}>
                  {status.label}
                </Chip>
              </div>
              <p className="text-sm font-semibold text-title tabular-nums">
                {formatRupiah(invoice.outstanding)}
              </p>
            </li>
          );
        })}
      </ul>
      <Pagination
        page={currentPage}
        pageCount={pageCount}
        total={invoices.length}
        pageSize={ROWS_PER_PAGE}
        itemLabel="invoices"
        onPageChange={setPage}
      />
    </div>
  );
}
