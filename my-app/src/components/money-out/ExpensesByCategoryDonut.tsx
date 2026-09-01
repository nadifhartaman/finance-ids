"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { formatRupiah } from "@/lib/format";
import type { BudgetItem } from "@/lib/types";

/** Ordinal purple ramp, darkest = largest slice (data sorted desc before render). */
const SLICE_COLORS = [
  "var(--color-primary-700)",
  "var(--color-primary-600)",
  "var(--color-primary-500)",
];

export default function ExpensesByCategoryDonut({ data }: { data: BudgetItem[] }) {
  const sorted = [...data].sort((a, b) => b.spent - a.spent);
  const total = sorted.reduce((sum, d) => sum + d.spent, 0);

  if (total === 0) {
    return <p className="text-sm text-ink-secondary">No expenses recorded yet.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sorted}
              dataKey="spent"
              nameKey="name"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              stroke="none"
            >
              {sorted.map((entry, index) => (
                <Cell key={entry.id} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend carries identity — color is supplementary, never the only cue. */}
      <ul className="w-full space-y-2.5">
        {sorted.map((entry, index) => (
          <li key={entry.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-ink-secondary">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length] }}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-title tabular-nums">
              {formatRupiah(entry.spent)}
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 border-t border-card-border pt-2.5 text-sm">
          <span className="font-medium text-ink-secondary">Total</span>
          <span className="font-semibold text-title tabular-nums">{formatRupiah(total)}</span>
        </li>
      </ul>
    </div>
  );
}
