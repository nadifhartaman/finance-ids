/**
 * Pure derivation rules — the code twin of docs/erd.md's "Derived, never
 * stored" table. Every status/health shown in the UI is computed here from
 * facts; nothing in this file touches the database.
 */

import { daysBetween } from "./time.js";

/* ─────────────────────────── Invoices ─────────────────────────── */

export interface InvoiceFacts {
  amount: number;
  amountPaid: number;
  dueDate: string; // ISO
  paidDate: string | null;
  voidedAt: string | null;
  documentStatus: "draft" | "posted" | "cancelled";
}

export type InvoiceStatusKind =
  | "draft"
  | "cancelled"
  | "void"
  | "paid"
  | "overdue"
  | "partially-paid"
  | "awaiting";

export interface InvoiceStatus {
  kind: InvoiceStatusKind;
  label: string;
  daysOverdue: number;
}

/**
 * Precedence: draft/cancelled (document lifecycle, never posted) > void
 * (posted then reversed) > paid > overdue > partially-paid > awaiting.
 * Overdue beats partial because status is an attention signal — a late
 * invoice that's 80% paid still needs chasing. The UI can still show
 * progress from amount/amountPaid, which travel alongside.
 */
export function invoiceStatus(invoice: InvoiceFacts, today: Date): InvoiceStatus {
  if (invoice.documentStatus === "draft") {
    return { kind: "draft", label: "Draft", daysOverdue: 0 };
  }
  if (invoice.documentStatus === "cancelled") {
    return { kind: "cancelled", label: "Cancelled", daysOverdue: 0 };
  }
  if (invoice.voidedAt) {
    return { kind: "void", label: "Voided", daysOverdue: 0 };
  }
  if (invoice.paidDate) {
    return { kind: "paid", label: "Paid", daysOverdue: 0 };
  }
  const daysOverdue = daysBetween(invoice.dueDate, today);
  if (daysOverdue > 0) {
    return { kind: "overdue", label: `Overdue ${daysOverdue} days`, daysOverdue };
  }
  if (invoice.amountPaid > 0) {
    return { kind: "partially-paid", label: "Partially paid", daysOverdue: 0 };
  }
  return { kind: "awaiting", label: "Waiting for payment", daysOverdue: 0 };
}

export function outstanding(invoice: InvoiceFacts): number {
  return invoice.amount - invoice.amountPaid;
}

/* ─────────────────────────── Budgets ─────────────────────────── */

export type BudgetHealthKind = "on-track" | "near-limit" | "over";

export interface BudgetHealth {
  kind: BudgetHealthKind;
  label: string;
  pctUsed: number; // rounded, uncapped (can exceed 100)
  remaining: number; // negative when over budget
}

export function budgetHealth(planned: number, spent: number): BudgetHealth {
  const pctUsed = Math.round((spent / planned) * 100);
  const remaining = planned - spent;
  if (pctUsed > 100) {
    return { kind: "over", label: "Over budget", pctUsed, remaining };
  }
  if (pctUsed >= 90) {
    return { kind: "near-limit", label: "Close to the limit", pctUsed, remaining };
  }
  return { kind: "on-track", label: "On track", pctUsed, remaining };
}

/* ─────────────────────────── Projects ─────────────────────────── */

export type ProjectHealthKind = "over-budget" | "near-billing" | "on-schedule";

export interface ProjectHealthInfo {
  kind: ProjectHealthKind;
  label: string;
  progressPct: number; // billed / contractValue, rounded
}

export function projectHealth(
  contractValue: number,
  billedToDate: number,
  budget: number | null,
  spent: number,
): ProjectHealthInfo {
  const progressPct = Math.round((billedToDate / contractValue) * 100);
  if (budget !== null && spent > budget) {
    return { kind: "over-budget", label: "Over budget", progressPct };
  }
  if (progressPct >= 90) {
    return { kind: "near-billing", label: "Close to billing", progressPct };
  }
  return { kind: "on-schedule", label: "On schedule", progressPct };
}

export const PROJECT_HEALTH_ORDER: Record<ProjectHealthKind, number> = {
  "over-budget": 0,
  "near-billing": 1,
  "on-schedule": 2,
};
