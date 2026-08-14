"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Chip } from "@/components/ui/chip";
import { formatDate, formatRupiah } from "@/lib/format";
import { APP_ROUTES, invoiceRoute } from "@/lib/routes";
import {
  cancelInvoiceDraft,
  createInvoiceDraft,
  postInvoiceDoc,
  updateInvoiceDraft,
  voidInvoice,
  type InvoiceDocInput,
} from "@/lib/invoices-actions";
import RecordPaymentDialog from "./RecordPaymentDialog";
import type { Invoice, InvoiceDocument, ProjectOption } from "@/lib/types";

const fieldClass =
  "w-full rounded-lg border border-card-border bg-card px-3 py-2 text-title outline-none focus:border-primary-300 disabled:bg-soft disabled:text-ink-muted";
const labelClass = "mb-1.5 block text-sm font-medium text-title";

export default function InvoiceForm({
  invoice,
  projects,
  canWrite,
}: {
  /** undefined = the /new page. */
  invoice?: InvoiceDocument;
  projects: ProjectOption[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const isDraft = !invoice || invoice.status === "draft";
  const isPosted = invoice?.status === "posted";
  const isVoided = !!invoice?.voidedAt;
  const isCancelled = invoice?.status === "cancelled";
  const readOnly = !canWrite || !isDraft;

  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber ?? "");
  const [projectId, setProjectId] = useState(invoice?.projectId ?? "");
  const [amount, setAmount] = useState(invoice ? String(invoice.amount) : "");
  const [issuedDate, setIssuedDate] = useState(invoice?.issuedDate ?? "");
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? "");

  function buildInput(): InvoiceDocInput {
    return {
      invoiceNumber: invoiceNumber.trim(),
      projectId,
      amount: Number(amount),
      issuedDate,
      dueDate,
    };
  }

  function handleSaveDraft() {
    setError(null);
    const input = buildInput();
    if (!input.invoiceNumber || !input.projectId || !input.amount || input.amount <= 0 || !input.issuedDate || !input.dueDate) {
      setError("Invoice number, project, a positive amount, and both dates are required.");
      return;
    }
    if (input.dueDate < input.issuedDate) {
      setError("Due date must be on or after the issued date.");
      return;
    }

    startTransition(async () => {
      if (invoice) {
        const result = await updateInvoiceDraft(invoice.id, input);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.refresh();
      } else {
        const result = await createInvoiceDraft(input);
        if (result.error || !result.id) {
          setError(result.error ?? "Failed to create invoice.");
          return;
        }
        router.push(invoiceRoute(result.id));
      }
    });
  }

  function handlePost() {
    if (!invoice) return;
    setError(null);
    startTransition(async () => {
      // Save any unsaved edits first, then post.
      const saveResult = await updateInvoiceDraft(invoice.id, buildInput());
      if (saveResult.error) {
        setError(saveResult.error);
        return;
      }
      const postResult = await postInvoiceDoc(invoice.id);
      if (postResult.error) {
        setError(postResult.error);
        return;
      }
      router.refresh();
    });
  }

  function handleCancelDraft() {
    if (!invoice) return;
    if (!window.confirm("Cancel this draft? This can't be undone.")) return;
    startTransition(async () => {
      const result = await cancelInvoiceDraft(invoice.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(APP_ROUTES.receivables);
    });
  }

  function handleVoid() {
    if (!invoice) return;
    if (!window.confirm(`Cancel ${invoice.invoiceNumber}? This reverses it in the ledger.`)) return;
    startTransition(async () => {
      const result = await voidInvoice(invoice.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const isFullyPaid = !!invoice && invoice.amountPaid >= invoice.amount;
  const canCancelInvoice = isPosted && !isVoided && invoice!.amountPaid === 0;
  const canRecordPayment = isPosted && !isVoided && !isFullyPaid;

  const statusChip = isVoided ? (
    <Chip color="error">Voided</Chip>
  ) : isCancelled ? (
    <Chip color="gray">Cancelled</Chip>
  ) : isPosted ? (
    isFullyPaid ? (
      <Chip color="success">Paid</Chip>
    ) : invoice!.amountPaid > 0 ? (
      <Chip color="warning">Partially paid</Chip>
    ) : (
      <Chip color="gray">Awaiting payment</Chip>
    )
  ) : (
    <Chip color="primary">Draft</Chip>
  );

  // RecordPaymentDialog only reads id/number/amount/amountPaid/outstanding —
  // the other Invoice fields aren't shown by it, so placeholders are fine.
  const invoiceForPayment: Invoice | null = invoice
    ? {
        id: invoice.id,
        number: invoice.invoiceNumber,
        client: invoice.clientName,
        project: invoice.projectName,
        amount: invoice.amount,
        amountPaid: invoice.amountPaid,
        outstanding: invoice.amount - invoice.amountPaid,
        issuedDate: invoice.issuedDate,
        dueDate: invoice.dueDate,
        paidDate: invoice.paidDate ?? undefined,
        status: { kind: "awaiting", label: "", daysOverdue: 0 },
        documentStatus: invoice.status,
      }
    : null;

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <div className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-title">
                {invoice?.invoiceNumber ?? "New invoice"}
              </h2>
              {invoice && <p className="text-sm text-ink-muted">{invoice.clientName}</p>}
            </div>
            {statusChip}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={labelClass}>Invoice number</span>
              <input
                type="text"
                value={invoiceNumber}
                disabled={readOnly}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-2026-026"
                className={fieldClass}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className={labelClass}>Project</span>
              <select
                value={projectId}
                disabled={readOnly}
                onChange={(e) => setProjectId(e.target.value)}
                className={fieldClass}
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
              <span className={labelClass}>Amount</span>
              <span className="flex items-center gap-2 rounded-lg border border-card-border px-3 py-2 focus-within:border-primary-300">
                <span className="text-ink-muted">Rp</span>
                <input
                  type="number"
                  min={0}
                  value={amount}
                  disabled={readOnly}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent text-foreground outline-none disabled:text-ink-muted"
                />
              </span>
            </label>

            <label className="block">
              <span className={labelClass}>Issued date</span>
              <input
                type="date"
                value={issuedDate}
                disabled={readOnly}
                onChange={(e) => setIssuedDate(e.target.value)}
                className={fieldClass}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className={labelClass}>Due date</span>
              <input
                type="date"
                value={dueDate}
                disabled={readOnly}
                onChange={(e) => setDueDate(e.target.value)}
                className={fieldClass}
              />
            </label>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-chip-error-bg px-3 py-2 text-sm text-chip-error-text">{error}</p>
          )}

          {canWrite && (
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-card-border pt-4">
              {isDraft && (
                <>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleSaveDraft}
                    className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-title hover:bg-soft disabled:opacity-60"
                  >
                    Save draft
                  </button>
                  {invoice && (
                    <>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={handlePost}
                        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                      >
                        Post
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={handleCancelDraft}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-chip-error-text hover:bg-chip-error-bg disabled:opacity-60"
                      >
                        Cancel draft
                      </button>
                    </>
                  )}
                </>
              )}
              {canRecordPayment && (
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(true)}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  Record payment
                </button>
              )}
              {canCancelInvoice && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleVoid}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-chip-error-text hover:bg-chip-error-bg disabled:opacity-60"
                >
                  Cancel invoice
                </button>
              )}
            </div>
          )}

          {invoice?.status === "posted" && (
            <p className="mt-4 border-t border-card-border pt-4 text-xs text-ink-muted">
              Posted {formatDate(invoice.issuedDate)} · {formatRupiah(invoice.amount)}
              {invoice.amountPaid > 0 && ` · ${formatRupiah(invoice.amountPaid)} paid`}
            </p>
          )}
        </div>
      </div>

      {invoiceForPayment && (
        <RecordPaymentDialog
          isOpen={isPaymentOpen}
          onOpenChange={setIsPaymentOpen}
          invoice={invoiceForPayment}
        />
      )}
    </div>
  );
}
