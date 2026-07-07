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
import { formatRupiah } from "@/lib/format";
import { updateRevenueTarget } from "@/lib/trends-actions";

/** Director+ affordance (`targets.edit`): set this month's revenue target. */
export default function RevenueTargetEditor({
  currentPeriod,
  currentTarget,
}: {
  currentPeriod: string;
  currentTarget: number;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(String(currentTarget));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(close: () => void) {
    const value = Number(draft);
    if (!Number.isFinite(value) || value <= 0) return;
    startTransition(async () => {
      const result = await updateRevenueTarget(currentPeriod, value);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDraft(String(currentTarget));
          setError(null);
          setIsOpen(true);
        }}
        className="rounded-lg border border-card-border px-3 py-1.5 text-sm font-medium text-title hover:bg-soft"
      >
        Edit target
      </button>

      <Dialog isOpen={isOpen} onOpenChange={setIsOpen}>
        {({ close }) => (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save(close);
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit this month&apos;s revenue target</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <label className="block">
                <span className="mb-1.5 block font-medium text-title">
                  What are we aiming for this month?
                </span>
                <span className="flex items-center gap-2 rounded-lg border border-card-border px-3 py-2 focus-within:border-primary-300">
                  <span className="text-ink-muted">Rp</span>
                  <input
                    type="number"
                    min={0}
                    step={1000000}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="w-full bg-transparent text-foreground outline-none"
                    autoFocus
                  />
                </span>
              </label>
              <p className="mt-2 text-xs text-ink-muted">
                Current target {formatRupiah(currentTarget)}
              </p>
              {error && (
                <p className="mt-3 rounded-lg bg-chip-error-bg px-3 py-2 text-xs text-chip-error-text">
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
                {isPending ? "Saving…" : "Save target"}
              </button>
            </DialogFooter>
          </form>
        )}
      </Dialog>
    </>
  );
}
