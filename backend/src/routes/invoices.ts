import { Router } from "express";
import { invoiceStatus, outstanding } from "../lib/derive.js";
import { asOfLabel } from "../lib/format.js";
import { fetchInvoices } from "../lib/queries.js";
import { getToday } from "../lib/time.js";

export const invoicesRouter = Router();

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
