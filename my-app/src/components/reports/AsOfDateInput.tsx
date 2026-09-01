"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Plain date picker for a statement's `?asOf=` — trial balance and balance sheet are inception-to-date snapshots, not a bounded range, so the chip-style RangeSelect doesn't fit here. */
export default function AsOfDateInput({ asOf, basePath }: { asOf: string; basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm text-ink-secondary">
      As of
      <input
        type="date"
        value={asOf}
        disabled={isPending}
        onChange={(e) => {
          if (!e.target.value) return;
          const next = new URLSearchParams(searchParams.toString());
          next.set("asOf", e.target.value);
          startTransition(() => {
            router.push(`${basePath}?${next.toString()}`);
          });
        }}
        className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm font-medium text-title disabled:opacity-60"
      />
      {isPending && <span className="text-xs text-ink-muted">Updating…</span>}
    </label>
  );
}
