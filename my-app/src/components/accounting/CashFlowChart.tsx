"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatRupiah } from "@/lib/format";
import type { CashFlowBucket } from "@/lib/types";

function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-card-border bg-card p-3 shadow-md">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <ul className="mt-1.5 space-y-1">
        {payload.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2 text-sm">
            <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-ink-secondary">{entry.name}</span>
            <span className="font-semibold text-title">{formatRupiah(entry.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CashFlowChart({ buckets }: { buckets: CashFlowBucket[] }) {
  const data = buckets.map((b) => ({ ...b, label: shortDate(b.periodStart) }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-card-border)" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--color-card-border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatRupiah}
            width={72}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 13, color: "var(--color-ink-secondary)" }} iconType="circle" iconSize={8} />
          <Bar dataKey="inflow" name="Inflow" fill="var(--color-chip-success-icon)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="outflow" name="Outflow" fill="var(--color-chip-error-icon)" radius={[3, 3, 0, 0]} />
          <Line
            type="monotone"
            dataKey="closing"
            name="Closing balance"
            stroke="var(--color-primary-600)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-card)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
