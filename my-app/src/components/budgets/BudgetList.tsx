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
import type { BudgetItem, ExpenseCategory } from "@/lib/types";
import { formatRupiah } from "@/lib/format";
import { updateCategoryBudget, updateProjectBudgetAmount } from "@/lib/budgets-actions";
import { expensesLaneRoute } from "@/lib/routes";
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
  initialCount,
  linkToExpenses,
  draftCounts,
}: {
  items: BudgetItem[];
  canEdit: boolean;
  kind: "category" | "project";
  layout?: "stack" | "grid" | "strip";
  /** Passed through to cards that have no plan in the current scope. */
  noPlanHint?: string;
  /** Collapse to this many items behind a "Show all" toggle when there are more. */
  initialCount?: number;
  /** When true (category kind only), each card links to its filtered expense lane. */
  linkToExpenses?: boolean;
  /** Draft-expense counts per category, rendered as a "N drafts waiting" footnote. */
  draftCounts?: Record<ExpenseCategory, number>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<BudgetItem | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showAll, setShowAll] = useState(false);

  const canCollapse = initialCount !== undefined && items.length > initialCount;
  const visibleItems = canCollapse && !showAll ? items.slice(0, initialCount) : items;

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
          layout === "grid" || layout === "strip"
            ? `grid gap-4 ${layout === "strip" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`
            : "space-y-4"
        }
      >
        {visibleItems.map((item) => {
          const category = item.id.replace(/^cat-/, "") as ExpenseCategory;
          const drafts = kind === "category" ? draftCounts?.[category] ?? 0 : 0;

          return (
            <BudgetItemCard
              key={item.id}
              item={item}
              onEdit={canEdit ? () => openEditor(item) : undefined}
              noPlanHint={noPlanHint}
              compact={layout === "strip"}
              href={
                kind === "category" && linkToExpenses
                  ? expensesLaneRoute(category)
                  : undefined
              }
              linkLabel="View expenses →"
              footnote={
                drafts > 0 ? (
                  <p className="mt-3 text-xs font-medium text-primary-700">
                    {drafts} draft{drafts === 1 ? "" : "s"} waiting to be posted
                  </p>
                ) : null
              }
            />
          );
        })}
      </div>

      {canCollapse && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-sm font-medium text-primary-700 hover:underline"
        >
          {showAll ? "Show less" : `Show all ${items.length}`}
        </button>
      )}

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
