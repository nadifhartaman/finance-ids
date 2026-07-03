"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { formatRupiah, type ProductLineRevenue } from "@/lib/mock-data";

/** Ordinal purple ramp, darkest = largest slice (data already sorted desc). */
const SLICE_COLORS = [
  "var(--color-primary-700)",
  "var(--color-primary-600)",
  "var(--color-primary-500)",
  "var(--color-primary-400)",
  "var(--color-primary-300)",
];

export default function ProductLineDonut({
  data,
}: {
  data: ProductLineRevenue[];
}) {
  const total = data.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="productLine"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={entry.productLine} fill={SLICE_COLORS[index]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend carries identity — color is supplementary, never the only cue. */}
      <ul className="w-full space-y-2.5">
        {data.map((entry, index) => (
          <li
            key={entry.productLine}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex items-center gap-2 text-ink-secondary">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: SLICE_COLORS[index] }}
              />
              {entry.productLine}
            </span>
            <span className="font-semibold text-title tabular-nums">
              {formatRupiah(entry.amount)}
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 border-t border-card-border pt-2.5 text-sm">
          <span className="font-medium text-ink-secondary">Total</span>
          <span className="font-semibold text-title tabular-nums">
            {formatRupiah(total)}
          </span>
        </li>
      </ul>
    </div>
  );
}
