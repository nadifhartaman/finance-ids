import { Router } from "express";
import { invoiceStatus, outstanding } from "../lib/derive.js";
import { asOfLabel } from "../lib/format.js";
import { requirePermission } from "../middleware/auth.js";
import {
  cancelDraftInvoice,
  createInvoice,
  postInvoice,
  recordInvoicePayment,
  updateInvoice,
  voidInvoice,
} from "../lib/mutations.js";
import { fetchInvoiceDocumentById, fetchInvoices } from "../lib/queries.js";
import { getToday } from "../lib/time.js";
import { isIsoDate } from "../lib/validate.js";

export const invoicesRouter = Router();

const NON_RECEIVABLE_KINDS = new Set(["paid", "void", "draft", "cancelled"]);

invoicesRouter.get("/", async (_req, res) => {
  const today = getToday();
  const rows = await fetchInvoices();

  const invoices = rows.map((row) => {
    const facts = {
      amount: row.amount,
      amountPaid: row.amount_paid,
      dueDate: row.due_date,
      paidDate: row.paid_date,
      voidedAt: row.voided_at,
      documentStatus: row.status,
    };
    return {
      id: row.id,
      number: row.invoice_number,
      client: row.project.client.name,
      project: row.project.name,
      amount: row.amount,
      amountPaid: row.amount_paid,
      outstanding: outstanding(facts),
      issuedDate: row.issued_date,
      dueDate: row.due_date,
      paidDate: row.paid_date ?? undefined,
      status: invoiceStatus(facts, today),
      documentStatus: row.status,
    };
  });

  // Only a posted, non-void invoice is a real outstanding receivable —
  // a draft/cancelled invoice never touched the ledger.
  const open = invoices.filter((i) => !NON_RECEIVABLE_KINDS.has(i.status.kind));
  const paid = invoices.filter((i) => i.status.kind === "paid");

  const summary = {
    totalUnpaid: open.reduce((s, i) => s + i.outstanding, 0),
    totalOverdue: open
      .filter((i) => i.status.kind === "overdue")
      .reduce((s, i) => s + i.outstanding, 0),
    totalAwaiting: open
      .filter((i) => i.status.kind !== "overdue")
      .reduce((s, i) => s + i.outstanding, 0),
    averageDaysToPay:
      paid.length === 0
        ? 0
        : Math.round(
            paid.reduce((sum, i) => {
              const issued = new Date(`${i.issuedDate}T00:00:00Z`).getTime();
              const paidAt = new Date(`${i.paidDate}T00:00:00Z`).getTime();
              return sum + (paidAt - issued) / (1000 * 60 * 60 * 24);
            }, 0) / paid.length,
          ),
  };

  res.json({ asOf: asOfLabel(today), invoices, summary });
});

invoicesRouter.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid invoice id" });
    return;
  }
  const invoice = await fetchInvoiceDocumentById(id);
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  res.json(invoice);
});

invoicesRouter.post("/", requirePermission("invoices.write"), async (req, res) => {
  const { invoiceNumber, projectId, amount, issuedDate, dueDate } = req.body ?? {};
  if (
    typeof invoiceNumber !== "string" ||
    !invoiceNumber.trim() ||
    typeof projectId !== "string" ||
    !projectId.trim() ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !isIsoDate(issuedDate) ||
    !isIsoDate(dueDate) ||
    dueDate < issuedDate
  ) {
    res.status(400).json({
      error:
        "invoiceNumber, projectId, and a positive amount are required, and dueDate must be on or after issuedDate",
    });
    return;
  }

  try {
    const { id } = await createInvoice(
      { invoiceNumber: invoiceNumber.trim(), projectId, amount, issuedDate, dueDate },
      req.user!.id,
    );
    res.status(201).json({ id });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to create invoice" });
  }
});

invoicesRouter.patch("/:id", requirePermission("invoices.write"), async (req, res) => {
  const { id } = req.params;
  const { invoiceNumber, projectId, amount, issuedDate, dueDate } = req.body ?? {};
  if (
    typeof id !== "string" ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !isIsoDate(issuedDate) ||
    !isIsoDate(dueDate) ||
    dueDate < issuedDate ||
    (invoiceNumber !== undefined && (typeof invoiceNumber !== "string" || !invoiceNumber.trim())) ||
    (projectId !== undefined && (typeof projectId !== "string" || !projectId.trim()))
  ) {
    res.status(400).json({
      error: "A positive amount is required, and dueDate must be on or after issuedDate",
    });
    return;
  }

  try {
    await updateInvoice(
      id,
      {
        invoiceNumber: typeof invoiceNumber === "string" ? invoiceNumber.trim() : undefined,
        projectId: typeof projectId === "string" ? projectId : undefined,
        amount,
        issuedDate,
        dueDate,
      },
      req.user!.id,
    );
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update invoice";
    res.status(message === "Only a draft invoice can be edited" ? 409 : 400).json({ error: message });
  }
});

invoicesRouter.post("/:id/post", requirePermission("invoices.write"), async (req, res) => {
  const { id } = req.params;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid invoice id" });
    return;
  }
  try {
    const result = await postInvoice(id, req.user!.id);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to post invoice";
    res.status(message === "Only a draft invoice can be posted" ? 409 : 400).json({ error: message });
  }
});

invoicesRouter.post("/:id/cancel", requirePermission("invoices.write"), async (req, res) => {
  const { id } = req.params;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid invoice id" });
    return;
  }
  try {
    await cancelDraftInvoice(id, req.user!.id);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to cancel invoice";
    res.status(message === "Only a draft invoice can be cancelled" ? 409 : 400).json({ error: message });
  }
});

invoicesRouter.patch("/:id/payment", requirePermission("invoices.write"), async (req, res) => {
  const { id } = req.params;
  const { amountReceived, receivedDate } = req.body ?? {};
  if (
    typeof id !== "string" ||
    typeof amountReceived !== "number" ||
    !Number.isFinite(amountReceived) ||
    amountReceived <= 0 ||
    !isIsoDate(receivedDate)
  ) {
    res.status(400).json({ error: "A positive amountReceived and a valid receivedDate are required" });
    return;
  }

  try {
    await recordInvoicePayment(id, amountReceived, receivedDate, req.user!.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to record payment" });
  }
});

invoicesRouter.patch("/:id/void", requirePermission("invoices.write"), async (req, res) => {
  const { id } = req.params;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid invoice id" });
    return;
  }
  try {
    await voidInvoice(id, req.user!.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to cancel invoice" });
  }
});
