"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRupiah, type MonthlyRevenue } from "@/lib/mock-data";

function compactRupiah(value: number): string {
  if (value === 0) return "Rp 0";
  return formatRupiah(value);
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
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-ink-secondary">{entry.name}</span>
            <span className="font-semibold text-title">
              {formatRupiah(entry.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RevenueTrendChart({
  data,
}: {
  data: MonthlyRevenue[];
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary-600)" stopOpacity={0.12} />
              <stop offset="100%" stopColor="var(--color-primary-600)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--color-card-border)"
            strokeDasharray="0"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--color-card-border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={compactRupiah}
            width={72}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 13, color: "var(--color-ink-secondary)" }}
            iconType="circle"
            iconSize={8}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="var(--color-primary-600)"
            strokeWidth={2}
            fill="url(#revenueFill)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--color-card)" }}
          />
          <Line
            type="monotone"
            dataKey="target"
            name="Target"
            stroke="var(--color-ink-muted)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
