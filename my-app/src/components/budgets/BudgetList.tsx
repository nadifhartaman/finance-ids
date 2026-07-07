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
import type { BudgetItem } from "@/lib/types";
import { formatRupiah } from "@/lib/format";
import { updateCategoryBudget, updateProjectBudgetAmount } from "@/lib/budgets-actions";
import BudgetItemCard from "./BudgetItemCard";

/**
 * Client island around BudgetItemCard: when the current role may edit
 * budgets, each card gets an "Edit budget" affordance opening a dialog.
 * Persists via PATCH /api/budgets/categories/:category (kind="category")
 * or PATCH /api/projects/:id/budget (kind="project"), then refreshes the
 * page's server data so the health/chip/bar reflect the real recompute.
 */
export default function BudgetList({
  items,
  canEdit,
  kind,
  layout = "stack",
  noPlanHint,
}: {
  items: BudgetItem[];
  canEdit: boolean;
  kind: "category" | "project";
  layout?: "stack" | "grid";
  /** Passed through to cards that have no plan in the current scope. */
  noPlanHint?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<BudgetItem | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openEditor(item: BudgetItem) {
    setEditing(item);
    setDraft(item.budget === null ? "" : String(item.budget));
    setError(null);
  }

  function save(close: () => void) {
    const value = Number(draft);
    if (!editing || !Number.isFinite(value) || value <= 0) return;

    startTransition(async () => {
      const result =
        kind === "category"
          ? await updateCategoryBudget(editing.id.replace(/^cat-/, ""), value)
          : await updateProjectBudgetAmount(editing.id, value);

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
      <div
        className={
          layout === "grid" ? "grid gap-4 sm:grid-cols-2" : "space-y-4"
        }
      >
        {items.map((item) => (
          <BudgetItemCard
            key={item.id}
            item={item}
            onEdit={canEdit ? () => openEditor(item) : undefined}
            noPlanHint={noPlanHint}
          />
        ))}
      </div>

      <Dialog
        isOpen={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        {({ close }) => (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save(close);
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit budget — {editing?.name}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <label className="block">
                <span className="mb-1.5 block font-medium text-title">
                  How much do we plan to spend?
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
              {editing && (
                <p className="mt-2 text-xs text-ink-muted">
                  {editing.budget !== null && (
                    <>Current budget {formatRupiah(editing.budget)} · </>
                  )}
                  Spent so far {formatRupiah(editing.spent)}
                </p>
              )}
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
                {isPending ? "Saving…" : "Save change"}
              </button>
            </DialogFooter>
          </form>
        )}
      </Dialog>
    </>
  );
}
