/*
 * ⚠️ MOCK DATA — every number on the dashboard comes from this file.
 * This exists only so the Director can review the layout. When the backend
 * API exists, replace these exports with fetch calls and delete this file.
 */

export type HealthStatus = "good" | "watch" | "action";

export interface HeadlineStat {
  id: string;
  label: string;
  value: number; // IDR
  status: HealthStatus;
  /** Plain-language answer to "so what?" — no jargon (see root CLAUDE.md glossary) */
  note: string;
  /** Signed change vs a named period, e.g. "+ Rp 90 jt vs last month" */
  delta?: { text: string; direction: "up" | "down"; upIsGood: boolean };
}

export interface AttentionItem {
  id: string;
  severity: "critical" | "warning";
  message: string;
  suggestedAction: string;
}

export interface ProjectStats {
  active: number;
  nearBilling: number;
  overBudget: number;
  /** Signed but not yet billed */
  pipelineValue: number; // IDR
  flaggedProject: string;
}

export const asOf = "30 June 2026";
export const period = "June 2026";

/** Fixed "today" so overdue/day-count math is deterministic (no client/server hydration drift). */
const TODAY = new Date("2026-06-30T00:00:00Z");

export const headlineStats: HeadlineStat[] = [
  {
    id: "cash",
    label: "Cash on hand",
    value: 8_200_000_000,
    status: "good",
    note: "Enough to run the company for about 6 months at current spending.",
    delta: { text: "+ Rp 400 jt vs last month", direction: "up", upIsGood: true },
  },
  {
    id: "revenue",
    label: "Revenue this month",
    value: 3_400_000_000,
    status: "watch",
    note: "85% of this month's target (Rp 4 M). Two contracts still waiting on signatures.",
    delta: { text: "− Rp 600 jt vs target", direction: "down", upIsGood: true },
  },
  {
    id: "profit",
    label: "Operating profit",
    value: 620_000_000,
    status: "good",
    note: "We earned more than we spent this month.",
    delta: { text: "+ Rp 90 jt vs last month", direction: "up", upIsGood: true },
  },
];

export const attentionItems: AttentionItem[] = [
  {
    id: "a1",
    severity: "critical",
    message:
      "3 invoices from Bapenda are more than 60 days overdue — Rp 1,2 M in total.",
    suggestedAction: "Follow up with the finance contact at Bapenda this week.",
  },
  {
    id: "a2",
    severity: "warning",
    message: "The VIANA – Dishub project has spent 20% more than its budget.",
    suggestedAction: "Review project costs with the project lead.",
  },
  {
    id: "a3",
    severity: "warning",
    message: "Operational spending this month is 8% above plan.",
    suggestedAction: "Check the operations category before approving new spending.",
  },
];

export const projectStats: ProjectStats = {
  active: 12,
  nearBilling: 3,
  overBudget: 1,
  pipelineValue: 9_600_000_000,
  flaggedProject: "VIANA – Dishub",
};

/* ─────────────────────────── Invoices ─────────────────────────── */

export interface Invoice {
  id: string;
  number: string;
  client: string;
  project: string;
  amount: number; // IDR
  issuedDate: string; // ISO
  dueDate: string; // ISO
  paidDate?: string; // ISO — present only when paid
}

export type InvoiceStatusKind = "paid" | "awaiting" | "overdue";

export interface InvoiceStatus {
  kind: InvoiceStatusKind;
  label: string;
  daysOverdue: number;
}

/** Status is derived from dates, never stored — one source of truth. */
export function invoiceStatus(invoice: Invoice): InvoiceStatus {
  if (invoice.paidDate) {
    return { kind: "paid", label: "Paid", daysOverdue: 0 };
  }
  const due = new Date(invoice.dueDate);
  const overdueMs = TODAY.getTime() - due.getTime();
  const daysOverdue = Math.floor(overdueMs / (1000 * 60 * 60 * 24));
  if (daysOverdue > 0) {
    return { kind: "overdue", label: `Overdue ${daysOverdue} days`, daysOverdue };
  }
  return { kind: "awaiting", label: "Waiting for payment", daysOverdue: 0 };
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const invoices: Invoice[] = [
  { id: "inv-001", number: "INV-2026-001", client: "Bapenda", project: "VIANA – Dishub", amount: 480_000_000, issuedDate: "2026-03-10", dueDate: "2026-03-25" },
  { id: "inv-002", number: "INV-2026-002", client: "Bapenda", project: "AIoT – Bapenda ID", amount: 390_000_000, issuedDate: "2026-03-18", dueDate: "2026-04-02" },
  { id: "inv-003", number: "INV-2026-003", client: "Bapenda", project: "Indi AI Rollout", amount: 330_000_000, issuedDate: "2026-03-22", dueDate: "2026-04-06" },
  { id: "inv-004", number: "INV-2026-004", client: "Pertamina", project: "ORION – Refinery Sensors", amount: 850_000_000, issuedDate: "2026-06-01", dueDate: "2026-06-18" },
  { id: "inv-005", number: "INV-2026-005", client: "Diskominfo", project: "3D Digital Twin – City Center", amount: 430_000_000, issuedDate: "2026-06-15", dueDate: "2026-07-15" },
  { id: "inv-006", number: "INV-2026-006", client: "RSUD Hasan Sadikin", project: "AIoT – Patient ID", amount: 210_000_000, issuedDate: "2026-06-20", dueDate: "2026-07-20" },
  { id: "inv-007", number: "INV-2026-007", client: "Dishub", project: "VIANA – Traffic Analytics", amount: 610_000_000, issuedDate: "2026-03-02", dueDate: "2026-03-17", paidDate: "2026-03-15" },
  { id: "inv-008", number: "INV-2026-008", client: "Komdigi", project: "Indi AI Rollout", amount: 720_000_000, issuedDate: "2026-03-10", dueDate: "2026-03-25", paidDate: "2026-03-22" },
  { id: "inv-009", number: "INV-2026-009", client: "Kemenperin", project: "ORION – Factory Monitoring", amount: 540_000_000, issuedDate: "2026-04-01", dueDate: "2026-04-16", paidDate: "2026-04-14" },
  { id: "inv-010", number: "INV-2026-010", client: "Pertamina", project: "3D Digital Twin – Depot", amount: 380_000_000, issuedDate: "2026-04-12", dueDate: "2026-04-27", paidDate: "2026-04-25" },
  { id: "inv-011", number: "INV-2026-011", client: "Bapenda", project: "VIANA – Dishub", amount: 295_000_000, issuedDate: "2026-04-28", dueDate: "2026-05-13", paidDate: "2026-05-10" },
  { id: "inv-012", number: "INV-2026-012", client: "RSUD Hasan Sadikin", project: "AIoT – Patient ID", amount: 245_000_000, issuedDate: "2026-05-02", dueDate: "2026-05-17", paidDate: "2026-05-16" },
  { id: "inv-013", number: "INV-2026-013", client: "Diskominfo", project: "Indi AI Rollout", amount: 505_000_000, issuedDate: "2026-05-05", dueDate: "2026-05-20", paidDate: "2026-05-19" },
  { id: "inv-014", number: "INV-2026-014", client: "Dishub", project: "3D Digital Twin – City Center", amount: 615_000_000, issuedDate: "2026-05-08", dueDate: "2026-05-23", paidDate: "2026-05-21" },
  { id: "inv-015", number: "INV-2026-015", client: "Komdigi", project: "ORION – Data Platform", amount: 460_000_000, issuedDate: "2026-05-11", dueDate: "2026-05-26", paidDate: "2026-05-24" },
  { id: "inv-016", number: "INV-2026-016", client: "Kemenperin", project: "VIANA – Factory Safety", amount: 355_000_000, issuedDate: "2026-05-14", dueDate: "2026-05-29", paidDate: "2026-05-27" },
  { id: "inv-017", number: "INV-2026-017", client: "Pertamina", project: "AIoT – Fleet Tracking", amount: 675_000_000, issuedDate: "2026-05-18", dueDate: "2026-06-02", paidDate: "2026-06-01" },
  { id: "inv-018", number: "INV-2026-018", client: "Bapenda", project: "Indi AI Rollout", amount: 310_000_000, issuedDate: "2026-05-20", dueDate: "2026-06-04", paidDate: "2026-06-03" },
  { id: "inv-019", number: "INV-2026-019", client: "RSUD Hasan Sadikin", project: "3D Digital Twin – Hospital Wing", amount: 420_000_000, issuedDate: "2026-05-22", dueDate: "2026-06-06", paidDate: "2026-06-05" },
  { id: "inv-020", number: "INV-2026-020", client: "Diskominfo", project: "ORION – City Sensors", amount: 590_000_000, issuedDate: "2026-05-25", dueDate: "2026-06-09", paidDate: "2026-06-08" },
  { id: "inv-021", number: "INV-2026-021", client: "Dishub", project: "VIANA – Traffic Analytics", amount: 265_000_000, issuedDate: "2026-05-28", dueDate: "2026-06-12", paidDate: "2026-06-10" },
  { id: "inv-022", number: "INV-2026-022", client: "Komdigi", project: "AIoT – Smart ID", amount: 515_000_000, issuedDate: "2026-06-02", dueDate: "2026-06-17", paidDate: "2026-06-15" },
  { id: "inv-023", number: "INV-2026-023", client: "Kemenperin", project: "Indi AI Rollout", amount: 385_000_000, issuedDate: "2026-06-05", dueDate: "2026-06-20", paidDate: "2026-06-18" },
  { id: "inv-024", number: "INV-2026-024", client: "Pertamina", project: "ORION – Refinery Sensors", amount: 705_000_000, issuedDate: "2026-06-08", dueDate: "2026-06-23", paidDate: "2026-06-21" },
  { id: "inv-025", number: "INV-2026-025", client: "Bapenda", project: "3D Digital Twin – City Center", amount: 340_000_000, issuedDate: "2026-06-12", dueDate: "2026-06-27", paidDate: "2026-06-24" },
];

export const totalUnpaid = invoices
  .filter((i) => invoiceStatus(i).kind !== "paid")
  .reduce((s, i) => s + i.amount, 0);

export const totalOverdue = invoices
  .filter((i) => invoiceStatus(i).kind === "overdue")
  .reduce((s, i) => s + i.amount, 0);

export const totalAwaiting = invoices
  .filter((i) => invoiceStatus(i).kind === "awaiting")
  .reduce((s, i) => s + i.amount, 0);

/** Average days clients take to pay us (DSO, in plain language) — paid invoices only. */
export const averageDaysToPay = Math.round(
  invoices
    .filter((i) => i.paidDate)
    .reduce((sum, i) => {
      const issued = new Date(i.issuedDate).getTime();
      const paid = new Date(i.paidDate!).getTime();
      return sum + (paid - issued) / (1000 * 60 * 60 * 24);
    }, 0) / invoices.filter((i) => i.paidDate).length,
);

/** Top unpaid invoices by amount — shown on the Dashboard "Money owed to us" card. */
export const unpaidInvoices = invoices
  .filter((i) => invoiceStatus(i).kind !== "paid")
  .sort((a, b) => b.amount - a.amount)
  .slice(0, 4);

/**
 * Indonesian short-scale money label: M = miliar (billion), jt = juta (million).
 * Matches how the delta strings above are written.
 */
export function formatRupiah(amount: number): string {
  if (amount >= 1_000_000_000) {
    const v = amount / 1_000_000_000;
    return `Rp ${v.toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  }
  const v = amount / 1_000_000;
  return `Rp ${v.toLocaleString("id-ID", { maximumFractionDigits: 0 })} jt`;
}
