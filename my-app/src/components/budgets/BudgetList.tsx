"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BudgetItem, BudgetHealth, BudgetHealthKind } from "@/lib/types";
import { formatRupiah } from "@/lib/format";
import BudgetItemCard from "./BudgetItemCard";

/**
 * Client island around BudgetItemCard: when the current role may edit
 * budgets, each card gets an "Edit budget" affordance opening a dialog.
 * Edits live in component state only (preview) until the backend API
 * exists to persist them.
 */
export default function BudgetList({
  items: initialItems,
  canEdit,
  layout = "stack",
}: {
  items: BudgetItem[];
  canEdit: boolean;
  layout?: "stack" | "grid";
}) {
  const [items, setItems] = useState(initialItems);
  const [editing, setEditing] = useState<BudgetItem | null>(null);
  const [draft, setDraft] = useState("");

  function openEditor(item: BudgetItem) {
    setEditing(item);
    setDraft(String(item.budget));
  }

  // TODO: Remove this local recompute when real PATCH endpoint lands.
  function recomputeHealth(budget: number, spent: number): BudgetHealth {
    const remaining = budget - spent;
    const pctUsed = budget === 0 ? 0 : Math.round((spent / budget) * 100);
    let kind: BudgetHealthKind = "on-track";
    let label = "On track";
    if (remaining < 0) {
      kind = "over";
      label = "Over budget";
    } else if (remaining < budget * 0.15) {
      kind = "near-limit";
      label = "Close to the limit";
    }
    return { kind, label, pctUsed, remaining };
  }

  function save(close: () => void) {
    const value = Number(draft);
    if (editing && Number.isFinite(value) && value > 0) {
      setItems((prev) =>
        prev.map((i) => {
          if (i.id === editing.id) {
            return { ...i, budget: value, health: recomputeHealth(value, i.spent) };
          }
          return i;
        })
      );
    }
    close();
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
                  Current budget {formatRupiah(editing.budget)} · Spent so far{" "}
                  {formatRupiah(editing.spent)}
                </p>
              )}
              <p className="mt-3 rounded-lg bg-soft px-3 py-2 text-xs text-ink-secondary">
                Preview only — changes are not saved yet and reset when the
                page reloads. Saving for real arrives with the backend.
              </p>
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
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Save change
              </button>
            </DialogFooter>
          </form>
        )}
      </Dialog>
    </>
  );
}
