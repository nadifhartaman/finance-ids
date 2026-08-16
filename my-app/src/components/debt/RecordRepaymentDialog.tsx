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
import { recordLoanRepayment } from "@/lib/loans-actions";
import { formatRupiahExact } from "@/lib/format";
import type { DebtOutstandingRow } from "@/lib/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function RecordRepaymentDialog({
  isOpen,
  onOpenChange,
  loan,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  loan: DebtOutstandingRow;
}) {
  const router = useRouter();
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestAmount, setInterestAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(close: () => void) {
    const principal = Number(principalAmount) || 0;
    const interest = Number(interestAmount) || 0;
    if ((principal <= 0 && interest <= 0) || !paymentDate) {
      setError("Enter a principal and/or interest amount, and a payment date.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await recordLoanRepayment(loan.loanId, {
        principalAmount: principal,
        interestAmount: interest,
        paymentDate,
      });
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
            <DialogTitle>Record repayment — {loan.reference}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-xs text-ink-muted">
              Outstanding {formatRupiahExact(loan.outstandingPrincipal)}
            </p>
            <label className="block">
              <span className="mb-1.5 block font-medium text-title">Principal paid</span>
              <span className="flex items-center gap-2 rounded-lg border border-card-border px-3 py-2 focus-within:border-primary-300">
                <span className="text-ink-muted">Rp</span>
                <input
                  type="number"
                  min={0}
                  max={loan.outstandingPrincipal}
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  className="w-full bg-transparent text-foreground outline-none"
                  autoFocus
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block font-medium text-title">Interest paid</span>
              <span className="flex items-center gap-2 rounded-lg border border-card-border px-3 py-2 focus-within:border-primary-300">
                <span className="text-ink-muted">Rp</span>
                <input
                  type="number"
                  min={0}
                  value={interestAmount}
                  onChange={(e) => setInterestAmount(e.target.value)}
                  className="w-full bg-transparent text-foreground outline-none"
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block font-medium text-title">Payment date</span>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-lg border border-card-border px-3 py-2 text-foreground outline-none focus:border-primary-300"
              />
            </label>
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
              {isPending ? "Saving…" : "Record repayment"}
            </button>
          </DialogFooter>
        </form>
      )}
    </Dialog>
  );
}
