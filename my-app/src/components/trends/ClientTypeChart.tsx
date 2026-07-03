"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { formatRupiah, type ClientTypeRevenue } from "@/lib/mock-data";

/** Government vs Private — a single magnitude comparison, not identity, so one hue. */
export default function ClientTypeChart({
  data,
}: {
  data: ClientTypeRevenue[];
}) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 56, left: 0, bottom: 0 }}
          barCategoryGap="30%"
        >
          <CartesianGrid
            stroke="var(--color-card-border)"
            horizontal={false}
          />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="type"
            tick={{ fill: "var(--color-ink-secondary)", fontSize: 13 }}
            axisLine={false}
            tickLine={false}
            width={130}
          />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {data.map((entry) => (
              <Cell key={entry.type} fill="var(--color-primary-600)" />
            ))}
            <LabelList
              dataKey="amount"
              position="right"
              formatter={(value) =>
                typeof value === "number" ? formatRupiah(value) : ""
              }
              style={{ fill: "var(--color-title)", fontSize: 13, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
