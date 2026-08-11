"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createExpense, type ExpenseFormState } from "@/lib/expenses-actions";
import type { ExpenseCategory, ProjectOption } from "@/lib/types";

const initialState: ExpenseFormState = { error: null };

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  payroll: "Payroll",
  operations: "Operations",
  project_costs: "Project costs",
};

/** admin+ affordance (`spending.write`): log a new expense against a category. */
export default function ExpenseFormDialog({
  isOpen,
  onOpenChange,
  projects,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const [state, formAction, isCreating] = useActionState(createExpense, initialState);
  const [category, setCategory] = useState<ExpenseCategory>("operations");

  useEffect(() => {
    if (state !== initialState && !state.error) {
      router.refresh();
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const isProjectCost = category === "project_costs";

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      {({ close }) => (
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Add expense</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block font-medium text-title">Category</span>
              <select
                name="category"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-title"
              >
                {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </label>
            {isProjectCost && (
              <label className="block">
                <span className="mb-1.5 block font-medium text-title">Project</span>
                <select
                  name="projectId"
                  required
                  defaultValue=""
                  className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-title"
                >
                  <option value="" disabled>
                    Select a project…
                  </option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.client}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="mb-1.5 block font-medium text-title">Description</span>
              <input
                name="description"
                type="text"
                required
                placeholder="Office rent — August"
                className="w-full rounded-lg border border-card-border px-3 py-2 text-foreground outline-none focus:border-primary-300"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-medium text-title">Amount</span>
              <span className="flex items-center gap-2 rounded-lg border border-card-border px-3 py-2 focus-within:border-primary-300">
                <span className="text-ink-muted">Rp</span>
                <input
                  name="amount"
                  type="number"
                  min={0}
                  required
                  className="w-full bg-transparent text-foreground outline-none"
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block font-medium text-title">Spent on</span>
              <input
                name="spentOn"
                type="date"
                required
                className="w-full rounded-lg border border-card-border px-3 py-2 text-foreground outline-none focus:border-primary-300"
              />
            </label>
            {state.error && (
              <p className="rounded-lg bg-chip-error-bg px-3 py-2 text-xs text-chip-error-text">
                {state.error}
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
              disabled={isCreating}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {isCreating ? "Adding…" : "Add expense"}
            </button>
          </DialogFooter>
        </form>
      )}
    </Dialog>
  );
}
