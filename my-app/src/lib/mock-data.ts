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

export interface UnpaidInvoice {
  id: string;
  client: string;
  amount: number; // IDR
  daysOverdue: number; // 0 = not yet due
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

export const unpaidInvoices: UnpaidInvoice[] = [
  { id: "i1", client: "Bapenda", amount: 1_200_000_000, daysOverdue: 64 },
  { id: "i2", client: "Pertamina", amount: 850_000_000, daysOverdue: 12 },
  { id: "i3", client: "Diskominfo", amount: 430_000_000, daysOverdue: 0 },
  { id: "i4", client: "RSUD Hasan Sadikin", amount: 210_000_000, daysOverdue: 0 },
];

export const totalUnpaid = unpaidInvoices.reduce((s, i) => s + i.amount, 0);

export const projectStats: ProjectStats = {
  active: 12,
  nearBilling: 3,
  overBudget: 1,
  pipelineValue: 9_600_000_000,
  flaggedProject: "VIANA – Dishub",
};

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
