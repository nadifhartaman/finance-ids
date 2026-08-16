"use client";

import { useState } from "react";
import { Chip, type ChipColor } from "@/components/ui/chip";
import { Pagination } from "@/components/ui/pagination";
import type { AttentionItem } from "@/lib/types";

const SEVERITY: Record<AttentionItem["severity"], { color: ChipColor; label: string }> = {
  critical: { color: "error", label: "Urgent" },
  warning: { color: "warning", label: "Watch" },
};

const ROWS_PER_PAGE = 5;

export default function NeedsAttention({ items }: { items: AttentionItem[] }) {
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(items.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = items.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE,
  );

  return (
    <section
      aria-labelledby="needs-attention"
      className="rounded-2xl border border-card-border bg-card p-5 shadow-xs"
    >
      <h2 id="needs-attention" className="text-lg font-semibold text-title">
        Needs attention
      </h2>
      <p className="mt-0.5 text-sm text-ink-secondary">
        Things that may need a decision from you.
      </p>
      <ul className="mt-4 divide-y divide-card-border">
        {pageItems.map((item) => {
          const severity = SEVERITY[item.severity];
          return (
            <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <Chip color={severity.color}>{severity.label}</Chip>
              <div>
                <p className="text-sm font-medium text-title">{item.message}</p>
                <p className="mt-0.5 text-sm text-ink-secondary">
                  {item.suggestedAction}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <Pagination
        page={currentPage}
        pageCount={pageCount}
        total={items.length}
        pageSize={ROWS_PER_PAGE}
        itemLabel="items"
        onPageChange={setPage}
      />
    </section>
  );
}
