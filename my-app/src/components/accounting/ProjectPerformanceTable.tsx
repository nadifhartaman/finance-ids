"use client";

import { useMemo, useState } from "react";
import { TableBody, TableCell, TableFillerRows, TableHead, TableHeader, TableRoot, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { formatRupiahExact } from "@/lib/format";
import type { ProjectProfitabilityRow } from "@/lib/types";

type SortKey = "revenue" | "cost" | "profit" | "marginPct";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "cost", label: "Cost" },
  { key: "profit", label: "Profit" },
  { key: "marginPct", label: "Margin" },
];

const ROWS_PER_PAGE = 5;

export default function ProjectPerformanceTable({ projects }: { projects: ProjectProfitabilityRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("profit");
  const [page, setPage] = useState(1);
  const [prevSortKey, setPrevSortKey] = useState(sortKey);

  const sorted = useMemo(() => {
    return [...projects].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return bv - av;
    });
  }, [projects, sortKey]);

  if (sortKey !== prevSortKey) {
    setPrevSortKey(sortKey);
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(sorted.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = sorted.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE,
  );

  return (
    <div>
      <TableRoot>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Client</TableHead>
            {COLUMNS.map((c) => (
              <TableHead key={c.key} className="text-right">
                <button
                  type="button"
                  onClick={() => setSortKey(c.key)}
                  className={`font-medium uppercase tracking-wide ${
                    sortKey === c.key ? "text-primary-600" : "text-ink-muted hover:text-title"
                  }`}
                >
                  {c.label} {sortKey === c.key && "↓"}
                </button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.map((p) => (
            <TableRow key={p.projectId}>
              <TableCell className="font-medium text-title">{p.projectName}</TableCell>
              <TableCell>{p.clientName}</TableCell>
              <TableCell className="text-right tabular-nums">{formatRupiahExact(p.revenue)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatRupiahExact(p.cost)}</TableCell>
              <TableCell
                className={`text-right font-medium tabular-nums ${p.profit < 0 ? "text-delta-down" : "text-title"}`}
              >
                {formatRupiahExact(p.profit)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {p.marginPct === null ? "—" : `${p.marginPct.toFixed(1)}%`}
              </TableCell>
            </TableRow>
          ))}
          <TableFillerRows count={ROWS_PER_PAGE - pageRows.length} colSpan={6} />
        </TableBody>
      </TableRoot>

      <Pagination
        page={currentPage}
        pageCount={pageCount}
        total={sorted.length}
        pageSize={ROWS_PER_PAGE}
        itemLabel="projects"
        onPageChange={setPage}
      />
    </div>
  );
}
