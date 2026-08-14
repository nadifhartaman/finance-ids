"use client";

import { useMemo, useState } from "react";
import { TableBody, TableCell, TableHead, TableHeader, TableRoot, TableRow } from "@/components/ui/table";
import { formatRupiahExact } from "@/lib/format";
import type { ProjectProfitabilityRow } from "@/lib/types";

type SortKey = "revenue" | "cost" | "profit" | "marginPct";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "cost", label: "Cost" },
  { key: "profit", label: "Profit" },
  { key: "marginPct", label: "Margin" },
];

export default function ProjectPerformanceTable({ projects }: { projects: ProjectProfitabilityRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("profit");

  const sorted = useMemo(() => {
    return [...projects].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return bv - av;
    });
  }, [projects, sortKey]);

  return (
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
        {sorted.map((p) => (
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
      </TableBody>
    </TableRoot>
  );
}
