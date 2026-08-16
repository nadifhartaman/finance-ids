"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LoanStatus } from "@/lib/types";

const OPTIONS: { value: LoanStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "settled", label: "Settled" },
  { value: "cancelled", label: "Cancelled" },
];

/** The Debt page's one filter: which loans to show. Pushes ?status= so the Server Component refetches. */
export default function DebtStatusSelect({ status }: { status: LoanStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm text-ink-secondary">
      Showing
      <select
        value={status}
        disabled={isPending}
        onChange={(e) => {
          startTransition(() => {
            router.push(`/debt?status=${e.target.value}`);
          });
        }}
        className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm font-medium text-title disabled:opacity-60"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {isPending && <span className="text-xs text-ink-muted">Updating…</span>}
    </label>
  );
}
