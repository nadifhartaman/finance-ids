"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Chip } from "@/components/ui/chip";
import { formatDate, formatRupiah } from "@/lib/format";
import { APP_ROUTES, expenseRoute } from "@/lib/routes";
import {
  cancelExpenseDraft,
  createExpenseDraft,
  postExpenseDoc,
  updateExpenseDraft,
  voidExpenseDoc,
  type ExpenseDocInput,
} from "@/lib/expenses-actions";
import { deleteAttachment, uploadAttachment } from "@/lib/attachments-actions";
import type {
  AccountOption,
  AttachmentItem,
  ExpenseCategory,
  ExpenseDocument,
  PartnerOption,
  ProjectOption,
} from "@/lib/types";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  payroll: "Payroll",
  operations: "Operational",
  project_costs: "Project costs",
};

const fieldClass =
  "w-full rounded-lg border border-card-border bg-card px-3 py-2 text-title outline-none focus:border-primary-300 disabled:bg-soft disabled:text-ink-muted";
const labelClass = "mb-1.5 block text-sm font-medium text-title";

export default function ExpenseForm({
  expense,
  projects,
  vendors,
  bankAccounts,
  attachments,
  canWrite,
}: {
  /** undefined = the /new page. */
  expense?: ExpenseDocument;
  projects: ProjectOption[];
  vendors: PartnerOption[];
  bankAccounts: AccountOption[];
  attachments: AttachmentItem[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const isDraft = !expense || expense.status === "draft";
  const isPosted = expense?.status === "posted" && !expense.voidedAt;
  const isVoided = !!expense?.voidedAt;
  const isCancelled = expense?.status === "cancelled";
  const readOnly = !canWrite || !isDraft;

  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "operations");
  const [projectId, setProjectId] = useState(expense?.projectId ?? "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [spentOn, setSpentOn] = useState(expense?.spentOn ?? "");
  const [paymentMode, setPaymentMode] = useState<"paid" | "unpaid">(expense?.dueDate ? "unpaid" : "paid");
  const [partnerId, setPartnerId] = useState(expense?.partnerId ?? "");
  const [dueDate, setDueDate] = useState(expense?.dueDate ?? "");
  const [paidFromAccountId, setPaidFromAccountId] = useState(expense?.paidFromAccountId ?? "");

  function buildInput(): ExpenseDocInput {
    const isProjectCost = category === "project_costs";
    const isUnpaid = paymentMode === "unpaid";
    return {
      category,
      projectId: isProjectCost ? projectId || null : null,
      description: description.trim(),
      amount: Number(amount),
      spentOn,
      dueDate: isUnpaid ? dueDate || null : null,
      partnerId: isUnpaid ? partnerId || null : null,
      paidFromAccountId: isUnpaid ? null : paidFromAccountId || null,
    };
  }

  function handleSaveDraft() {
    setError(null);
    const input = buildInput();
    if (!input.description || !input.amount || input.amount <= 0 || !input.spentOn) {
      setError("Description, a positive amount, and a date are required.");
      return;
    }
    if (input.category === "project_costs" && !input.projectId) {
      setError("Choose a project for a project cost.");
      return;
    }
    if (paymentMode === "unpaid" && (!input.partnerId || !input.dueDate)) {
      setError("Choose a vendor and a due date for an unpaid bill.");
      return;
    }

    startTransition(async () => {
      if (expense) {
        const result = await updateExpenseDraft(expense.id, input);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.refresh();
      } else {
        const result = await createExpenseDraft(input);
        if (result.error || !result.id) {
          setError(result.error ?? "Failed to create expense.");
          return;
        }
        for (const file of pendingFiles) {
          const formData = new FormData();
          formData.set("file", file);
          await uploadAttachment("expense", result.id, formData, [expenseRoute(result.id)]);
        }
        router.push(expenseRoute(result.id));
      }
    });
  }

  function handlePost() {
    if (!expense) return;
    setError(null);
    if (paymentMode === "paid" && !paidFromAccountId) {
      setError("Choose which account this was paid from before posting.");
      return;
    }
    startTransition(async () => {
      // Save any unsaved edits first, then post.
      const result = await updateExpenseDraft(expense.id, buildInput());
      if (result.error) {
        setError(result.error);
        return;
      }
      const postResult = await postExpenseDoc(expense.id);
      if (postResult.error) {
        setError(postResult.error);
        return;
      }
      router.refresh();
    });
  }

  function handleCancel() {
    if (!expense) return;
    if (!window.confirm("Cancel this draft? This can't be undone.")) return;
    startTransition(async () => {
      const result = await cancelExpenseDraft(expense.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(APP_ROUTES.expenses);
    });
  }

  function handleVoid() {
    if (!expense) return;
    if (!window.confirm(`Void ${expense.documentNumber}? This reverses it in the ledger.`)) return;
    startTransition(async () => {
      const result = await voidExpenseDoc(expense.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleUpload() {
    if (!expense) return;
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    setUploadNotice(null);
    startTransition(async () => {
      const result = await uploadAttachment("expense", expense.id, formData, [expenseRoute(expense.id)]);
      if (result.error) {
        setUploadNotice(result.error);
        return;
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    });
  }

  function handleStageFile() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setPendingFiles((prev) => [...prev, file]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRemovePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDeleteAttachment(attachmentId: string) {
    if (!expense) return;
    startTransition(async () => {
      const result = await deleteAttachment(attachmentId, [expenseRoute(expense.id)]);
      if (result.error) {
        setUploadNotice(result.error);
        return;
      }
      router.refresh();
    });
  }

  const statusChip = isVoided ? (
    <Chip color="error">Voided</Chip>
  ) : isCancelled ? (
    <Chip color="gray">Cancelled</Chip>
  ) : isPosted ? (
    <Chip color="success">Posted</Chip>
  ) : (
    <Chip color="primary">Draft</Chip>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-title">
                {expense?.documentNumber ?? "New expense"}
              </h2>
              <p className="text-sm text-ink-muted">{CATEGORY_LABELS[category]}</p>
            </div>
            {statusChip}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Category</span>
              <select
                value={category}
                disabled={readOnly}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className={fieldClass}
              >
                {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={labelClass}>Date</span>
              <input
                type="date"
                value={spentOn}
                disabled={readOnly}
                onChange={(e) => setSpentOn(e.target.value)}
                className={fieldClass}
              />
            </label>

            {category === "project_costs" && (
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
            )}

            <label className="block sm:col-span-2">
              <span className={labelClass}>What for</span>
              <input
                type="text"
                value={description}
                disabled={readOnly}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Office rent — August"
                className={fieldClass}
              />
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
              <span className={labelClass}>Paid</span>
              <select
                value={paymentMode}
                disabled={readOnly}
                onChange={(e) => setPaymentMode(e.target.value as "paid" | "unpaid")}
                className={fieldClass}
              >
                <option value="paid">Paid now</option>
                <option value="unpaid">Unpaid — bill to pay later</option>
              </select>
            </label>

            {paymentMode === "paid" ? (
              <label className="block sm:col-span-2">
                <span className={labelClass}>Paid from</span>
                <select
                  value={paidFromAccountId}
                  disabled={readOnly}
                  onChange={(e) => setPaidFromAccountId(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Choose an account…</option>
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="block">
                  <span className={labelClass}>Vendor</span>
                  <select
                    value={partnerId}
                    disabled={readOnly}
                    onChange={(e) => setPartnerId(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Choose a vendor…</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={labelClass}>Due date</span>
                  <input
                    type="date"
                    value={dueDate}
                    disabled={readOnly}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={fieldClass}
                  />
                </label>
              </>
            )}
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
                  {expense && (
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
                        onClick={handleCancel}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-chip-error-text hover:bg-chip-error-bg disabled:opacity-60"
                      >
                        Cancel entry
                      </button>
                    </>
                  )}
                </>
              )}
              {isPosted && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleVoid}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-chip-error-text hover:bg-chip-error-bg disabled:opacity-60"
                >
                  Void
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
          <h3 className="text-sm font-semibold text-title">Nota / proof</h3>

          {expense ? (
            <>
              <ul className="mt-3 space-y-2">
                {attachments.length === 0 && (
                  <li className="text-sm text-ink-muted">No files attached yet.</li>
                )}
                {attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-card-border px-3 py-2 text-sm"
                  >
                    <a
                      href={a.viewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 truncate font-medium text-primary-700 hover:underline"
                    >
                      {a.fileName}
                    </a>
                    {canWrite && isDraft && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(a.id)}
                        className="shrink-0 text-xs font-medium text-chip-error-text hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {canWrite && isDraft && (
                <div className="mt-4 space-y-2 border-t border-card-border pt-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    className="w-full text-sm text-ink-secondary"
                  />
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleUpload}
                    className="w-full rounded-lg border border-card-border px-3 py-2 text-sm font-medium text-title hover:bg-soft disabled:opacity-60"
                  >
                    Add a file
                  </button>
                  {uploadNotice && <p className="text-xs text-chip-error-text">{uploadNotice}</p>}
                </div>
              )}
            </>
          ) : canWrite ? (
            <>
              <ul className="mt-3 space-y-2">
                {pendingFiles.length === 0 && (
                  <li className="text-sm text-ink-muted">No files attached yet.</li>
                )}
                {pendingFiles.map((file, i) => (
                  <li
                    key={`${file.name}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-card-border px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium text-title">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePendingFile(i)}
                      className="shrink-0 text-xs font-medium text-chip-error-text hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-4 space-y-2 border-t border-card-border pt-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  className="w-full text-sm text-ink-secondary"
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleStageFile}
                  className="w-full rounded-lg border border-card-border px-3 py-2 text-sm font-medium text-title hover:bg-soft disabled:opacity-60"
                >
                  Add a file
                </button>
                <p className="text-xs text-ink-muted">Files are attached when you save the draft.</p>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">No files attached yet.</p>
          )}

          {expense?.status === "posted" && (
            <p className="mt-4 border-t border-card-border pt-4 text-xs text-ink-muted">
              Posted {formatDate(expense.spentOn)} · {formatRupiah(expense.amount)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
