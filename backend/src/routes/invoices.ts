import { Router } from "express";
import { invoiceStatus, outstanding } from "../lib/derive.js";
import { asOfLabel } from "../lib/format.js";
import { requirePermission } from "../middleware/auth.js";
import { createInvoice, updateInvoice, voidInvoice } from "../lib/mutations.js";
import { fetchInvoiceById, fetchInvoices } from "../lib/queries.js";
import { getToday } from "../lib/time.js";

export const invoicesRouter = Router();

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

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
    };
  });

  const open = invoices.filter(
    (i) => i.status.kind !== "paid" && i.status.kind !== "void",
  );
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
  const { amount, issuedDate, dueDate } = req.body ?? {};
  if (
    typeof id !== "string" ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !isIsoDate(issuedDate) ||
    !isIsoDate(dueDate) ||
    dueDate < issuedDate
  ) {
    res.status(400).json({
      error: "A positive amount is required, and dueDate must be on or after issuedDate",
    });
    return;
  }

  try {
    await updateInvoice(id, { amount, issuedDate, dueDate }, req.user!.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update invoice" });
  }
});

invoicesRouter.patch("/:id/void", requirePermission("invoices.write"), async (req, res) => {
  const { id } = req.params;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid invoice id" });
    return;
  }

  const before = await fetchInvoiceById(id);
  if (!before) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  if (before.voided_at) {
    res.status(400).json({ error: "This invoice is already cancelled" });
    return;
  }
  if (before.amount_paid > 0) {
    res.status(400).json({ error: "Cannot cancel an invoice that has payments recorded" });
    return;
  }

  await voidInvoice(id, req.user!.id);
  res.json({ ok: true });
});
