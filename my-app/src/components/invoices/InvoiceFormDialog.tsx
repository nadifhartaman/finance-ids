"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createInvoice, updateInvoice, type InvoiceFormState } from "@/lib/invoices-actions";
import type { Invoice, ProjectOption } from "@/lib/types";

const initialState: InvoiceFormState = { error: null };

/** admin+ affordance (`invoices.write`): create a new invoice, or edit an existing one's core fields. */
export default function InvoiceFormDialog({
  isOpen,
  onOpenChange,
  projects,
  invoice,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  projects: ProjectOption[];
  /** Present in edit mode; absent in create mode. */
  invoice?: Invoice;
}) {
  const router = useRouter();
  const isEdit = Boolean(invoice);

  const [createState, createAction, isCreating] = useActionState(createInvoice, initialState);
  useEffect(() => {
    if (!isEdit && createState !== initialState && !createState.error) {
      router.refresh();
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createState]);

  // Parent remounts this component per invoice (key={invoice?.id ?? "create"}),
  // so these initial values are always fresh — no sync effect needed.
  const [amount, setAmount] = useState(invoice ? String(invoice.amount) : "");
  const [issuedDate, setIssuedDate] = useState(invoice?.issuedDate ?? "");
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? "");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, startEditTransition] = useTransition();

  function saveEdit(close: () => void) {
    if (!invoice) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || !issuedDate || !dueDate) return;
    startEditTransition(async () => {
      const result = await updateInvoice(invoice.id, { amount: value, issuedDate, dueDate });
      if (result.error) {
        setEditError(result.error);
        return;
      }
      router.refresh();
      close();
    });
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      {({ close }) =>
        isEdit ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveEdit(close);
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit invoice — {invoice?.number}</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block font-medium text-title">Amount</span>
                <span className="flex items-center gap-2 rounded-lg border border-card-border px-3 py-2 focus-within:border-primary-300">
                  <span className="text-ink-muted">Rp</span>
                  <input
                    type="number"
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-transparent text-foreground outline-none"
                    autoFocus
                  />
                </span>
              </label>
              <label className="block">
                <span className="mb-1.5 block font-medium text-title">Issued date</span>
                <input
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  className="w-full rounded-lg border border-card-border px-3 py-2 text-foreground outline-none focus:border-primary-300"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-medium text-title">Due date</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-card-border px-3 py-2 text-foreground outline-none focus:border-primary-300"
                />
              </label>
              {editError && (
                <p className="rounded-lg bg-chip-error-bg px-3 py-2 text-xs text-chip-error-text">
                  {editError}
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
                disabled={isSavingEdit}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {isSavingEdit ? "Saving…" : "Save change"}
              </button>
            </DialogFooter>
          </form>
        ) : (
          <form action={createAction}>
            <DialogHeader>
              <DialogTitle>New invoice</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block font-medium text-title">Invoice number</span>
                <input
                  name="invoiceNumber"
                  type="text"
                  required
                  placeholder="INV-2026-026"
                  className="w-full rounded-lg border border-card-border px-3 py-2 text-foreground outline-none focus:border-primary-300"
                />
              </label>
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
                <span className="mb-1.5 block font-medium text-title">Issued date</span>
                <input
                  name="issuedDate"
                  type="date"
                  required
                  className="w-full rounded-lg border border-card-border px-3 py-2 text-foreground outline-none focus:border-primary-300"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-medium text-title">Due date</span>
                <input
                  name="dueDate"
                  type="date"
                  required
                  className="w-full rounded-lg border border-card-border px-3 py-2 text-foreground outline-none focus:border-primary-300"
                />
              </label>
              {createState.error && (
                <p className="rounded-lg bg-chip-error-bg px-3 py-2 text-xs text-chip-error-text">
                  {createState.error}
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
                {isCreating ? "Creating…" : "Create invoice"}
              </button>
            </DialogFooter>
          </form>
        )
      }
    </Dialog>
  );
}
