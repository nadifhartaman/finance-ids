"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { recordPayment } from "@/lib/invoices-actions";
import { formatRupiah } from "@/lib/format";
import type { Invoice } from "@/lib/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * admin+ affordance (`invoices.write`): record money that actually arrived.
 * Never sets status directly — amount_paid/paid_date are facts, status is
 * always derived from them (see docs/erd.md). Anything less than the
 * outstanding amount leaves the invoice "Partially paid"; the full amount
 * settles it to "Paid".
 */
export default function RecordPaymentDialog({
  isOpen,
  onOpenChange,
  invoice,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  invoice: Invoice;
}) {
  const router = useRouter();
  const [amountReceived, setAmountReceived] = useState(String(invoice.outstanding));
  const [receivedDate, setReceivedDate] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(close: () => void) {
    const value = Number(amountReceived);
    if (!Number.isFinite(value) || value <= 0 || !receivedDate) return;
    startTransition(async () => {
      const result = await recordPayment(invoice.id, { amountReceived: value, receivedDate });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      close();
    });
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      {({ close }) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(close);
          }}
        >
          <DialogHeader>
            <DialogTitle>Record payment — {invoice.number}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-xs text-ink-muted">
              Invoice amount {formatRupiah(invoice.amount)} · Already paid{" "}
              {formatRupiah(invoice.amountPaid)} · Outstanding{" "}
              {formatRupiah(invoice.outstanding)}
            </p>
            <label className="block">
              <span className="mb-1.5 block font-medium text-title">Amount received</span>
              <span className="flex items-center gap-2 rounded-lg border border-card-border px-3 py-2 focus-within:border-primary-300">
                <span className="text-ink-muted">Rp</span>
                <input
                  type="number"
                  min={0}
                  max={invoice.outstanding}
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="w-full bg-transparent text-foreground outline-none"
                  autoFocus
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block font-medium text-title">Date received</span>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full rounded-lg border border-card-border px-3 py-2 text-foreground outline-none focus:border-primary-300"
              />
            </label>
            <p className="text-xs text-ink-muted">
              Less than the full outstanding amount leaves this invoice
              &ldquo;Partially paid&rdquo;. The full amount marks it
              &ldquo;Paid&rdquo;.
            </p>
            {error && (
              <p className="rounded-lg bg-chip-error-bg px-3 py-2 text-xs text-chip-error-text">
                {error}
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-soft"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Record payment"}
            </button>
          </DialogFooter>
        </form>
      )}
    </Dialog>
  );
}
