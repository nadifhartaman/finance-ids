"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CashFlowRange } from "@/lib/accounting-period";

const OPTIONS: { value: CashFlowRange; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
];

export default function RangeSelect({ range, basePath }: { range: CashFlowRange; basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-card-border p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={isPending}
          onClick={() => {
            const next = new URLSearchParams(searchParams.toString());
            next.set("range", o.value);
            startTransition(() => {
              router.push(`${basePath}?${next.toString()}`);
            });
          }}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
            o.value === range ? "bg-primary-600 text-white" : "text-ink-secondary hover:bg-soft"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
