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

/* ─────────────────────────── Budgets ─────────────────────────── */

export interface BudgetItem {
  id: string;
  name: string;
  subtitle?: string; // client name, for project budgets
  budget: number; // IDR
  spent: number; // IDR
}

export type BudgetHealthKind = "on-track" | "near-limit" | "over";

export interface BudgetHealth {
  kind: BudgetHealthKind;
  label: string;
  pctUsed: number; // rounded, uncapped (can exceed 100)
  remaining: number; // negative when over budget
}

/** Health is derived from budget/spent, never stored — one source of truth. */
export function budgetHealth(item: BudgetItem): BudgetHealth {
  const pctUsed = Math.round((item.spent / item.budget) * 100);
  const remaining = item.budget - item.spent;
  if (pctUsed > 100) {
    return { kind: "over", label: "Over budget", pctUsed, remaining };
  }
  if (pctUsed >= 90) {
    return { kind: "near-limit", label: "Close to the limit", pctUsed, remaining };
  }
  return { kind: "on-track", label: "On track", pctUsed, remaining };
}

export const categoryBudgets: BudgetItem[] = [
  { id: "cat-payroll", name: "Payroll", budget: 1_400_000_000, spent: 1_350_000_000 },
  { id: "cat-operations", name: "Operations", budget: 650_000_000, spent: 702_000_000 },
  { id: "cat-project-costs", name: "Project costs", budget: 900_000_000, spent: 720_000_000 },
];

export const totalBudget = categoryBudgets.reduce((s, b) => s + b.budget, 0);
export const totalSpent = categoryBudgets.reduce((s, b) => s + b.spent, 0);
export const totalRemaining = totalBudget - totalSpent;
export const pctBudgetUsed = Math.round((totalSpent / totalBudget) * 100);

export const budgetInsights: string[] = [
  "Operations spent Rp 52 jt more than planned this month.",
  "VIANA – Dishub is 20% over its project budget — see Needs attention on the Dashboard.",
  `Project costs still have ${formatRupiah(180_000_000)} left to spend this month.`,
];

/* ─────────────────────────── Projects ─────────────────────────── */

export type ProductLine = "VIANA" | "ORION" | "AIoT" | "Indi AI" | "3D Digital Twin";

export interface Project {
  id: string;
  name: string;
  client: string;
  productLine: ProductLine;
  contractValue: number; // IDR
  billedToDate: number; // IDR
  /** Only tracked for a subset of projects — absent means no budget monitoring yet. */
  budget?: number; // IDR
  spent?: number; // IDR
}

export type ProjectHealthKind = "over-budget" | "near-billing" | "on-schedule";

export interface ProjectHealthInfo {
  kind: ProjectHealthKind;
  label: string;
  progressPct: number; // billed / contractValue, rounded
}

/** Health is derived from contract/billing/budget figures, never stored. */
export function projectHealth(project: Project): ProjectHealthInfo {
  const progressPct = Math.round(
    (project.billedToDate / project.contractValue) * 100,
  );
  if (project.budget !== undefined && project.spent !== undefined) {
    const pctBudgetUsedForProject = Math.round(
      (project.spent / project.budget) * 100,
    );
    if (pctBudgetUsedForProject > 100) {
      return { kind: "over-budget", label: "Over budget", progressPct };
    }
  }
  if (progressPct >= 90) {
    return { kind: "near-billing", label: "Close to billing", progressPct };
  }
  return { kind: "on-schedule", label: "On schedule", progressPct };
}

const PROJECT_HEALTH_ORDER: Record<ProjectHealthKind, number> = {
  "over-budget": 0,
  "near-billing": 1,
  "on-schedule": 2,
};

export const projects: Project[] = [
  { id: "prj-01", name: "VIANA – Dishub", client: "Dishub", productLine: "VIANA", contractValue: 1_200_000_000, billedToDate: 850_000_000, budget: 850_000_000, spent: 1_020_000_000 },
  { id: "prj-02", name: "ORION – Refinery Sensors", client: "Pertamina", productLine: "ORION", contractValue: 1_000_000_000, billedToDate: 940_000_000, budget: 900_000_000, spent: 702_000_000 },
  { id: "prj-03", name: "Indi AI Rollout", client: "Bapenda", productLine: "Indi AI", contractValue: 1_500_000_000, billedToDate: 800_000_000, budget: 500_000_000, spent: 460_000_000 },
  { id: "prj-04", name: "3D Digital Twin – City Center", client: "Diskominfo", productLine: "3D Digital Twin", contractValue: 1_600_000_000, billedToDate: 700_000_000, budget: 700_000_000, spent: 385_000_000 },
  { id: "prj-05", name: "AIoT – Patient ID", client: "RSUD Hasan Sadikin", productLine: "AIoT", contractValue: 900_000_000, billedToDate: 850_000_000, budget: 400_000_000, spent: 340_000_000 },
  { id: "prj-06", name: "VIANA – Traffic Analytics", client: "Dishub", productLine: "VIANA", contractValue: 1_800_000_000, billedToDate: 700_000_000 },
  { id: "prj-07", name: "ORION – Factory Monitoring", client: "Kemenperin", productLine: "ORION", contractValue: 1_600_000_000, billedToDate: 650_000_000 },
  { id: "prj-08", name: "AIoT – Fleet Tracking", client: "Pertamina", productLine: "AIoT", contractValue: 1_900_000_000, billedToDate: 700_000_000 },
  { id: "prj-09", name: "3D Digital Twin – Hospital Wing", client: "RSUD Hasan Sadikin", productLine: "3D Digital Twin", contractValue: 1_400_000_000, billedToDate: 550_000_000 },
  { id: "prj-10", name: "ORION – City Sensors", client: "Diskominfo", productLine: "ORION", contractValue: 1_500_000_000, billedToDate: 600_000_000 },
  { id: "prj-11", name: "AIoT – Smart ID", client: "Komdigi", productLine: "AIoT", contractValue: 800_000_000, billedToDate: 760_000_000 },
  { id: "prj-12", name: "VIANA – Factory Safety", client: "Kemenperin", productLine: "VIANA", contractValue: 3_500_000_000, billedToDate: 1_000_000_000 },
];

/** Sorted flagged-first so the Director sees problems before healthy projects. */
export const projectsSorted = [...projects].sort(
  (a, b) =>
    PROJECT_HEALTH_ORDER[projectHealth(a).kind] -
    PROJECT_HEALTH_ORDER[projectHealth(b).kind],
);

const overBudgetProjects = projects.filter(
  (p) => projectHealth(p).kind === "over-budget",
);

export const projectStats = {
  active: projects.length,
  nearBilling: projects.filter((p) => projectHealth(p).kind === "near-billing")
    .length,
  overBudget: overBudgetProjects.length,
  /** Signed but not yet billed */
  pipelineValue: projects.reduce(
    (sum, p) => sum + (p.contractValue - p.billedToDate),
    0,
  ),
  flaggedProject: overBudgetProjects[0]?.name ?? "",
};

/** Feeds the Budgets page — same values as before, now derived from `projects`. */
export const projectBudgets: BudgetItem[] = projects
  .filter((p): p is Project & { budget: number; spent: number } =>
    p.budget !== undefined && p.spent !== undefined,
  )
  .map((p) => ({
    id: p.id,
    name: p.name,
    subtitle: p.client,
    budget: p.budget,
    spent: p.spent,
  }));

/* ─────────────────────────── Trends ─────────────────────────── */

export interface MonthlyRevenue {
  month: string;
  revenue: number; // IDR
  target: number; // IDR
}

/** June matches the Dashboard headline: Rp 3,435 jt vs Rp 4 M target ≈ 85%. */
export const monthlyRevenue: MonthlyRevenue[] = [
  { month: "Jan", revenue: 2_650_000_000, target: 2_800_000_000 },
  { month: "Feb", revenue: 2_900_000_000, target: 3_000_000_000 },
  { month: "Mar", revenue: 3_050_000_000, target: 3_200_000_000 },
  { month: "Apr", revenue: 3_150_000_000, target: 3_400_000_000 },
  { month: "May", revenue: 3_300_000_000, target: 3_600_000_000 },
  { month: "Jun", revenue: 3_435_000_000, target: 4_000_000_000 },
];

const PRODUCT_LINES: ProductLine[] = [
  "VIANA",
  "ORION",
  "AIoT",
  "Indi AI",
  "3D Digital Twin",
];

/** Every invoice's `project` name is prefixed by its product line. */
function productLineOf(projectName: string): ProductLine {
  return PRODUCT_LINES.find((line) => projectName.startsWith(line))!;
}

export interface ProductLineRevenue {
  productLine: ProductLine;
  amount: number; // IDR
}

/** Derived from `invoices` — all 25 invoices grouped by product line. */
export const revenueByProductLine: ProductLineRevenue[] = PRODUCT_LINES.map(
  (productLine) => ({
    productLine,
    amount: invoices
      .filter((i) => productLineOf(i.project) === productLine)
      .reduce((sum, i) => sum + i.amount, 0),
  }),
).sort((a, b) => b.amount - a.amount);

export type ClientType = "Government (B2G)" | "Private (B2B)";

/** B2B clients are named explicitly; every other client is Government (B2G). */
const B2B_CLIENTS = new Set(["Pertamina"]);

export interface ClientTypeRevenue {
  type: ClientType;
  amount: number; // IDR
}

/** Derived from `invoices` — all 25 invoices grouped by client type. */
export const revenueByClientType: ClientTypeRevenue[] = [
  {
    type: "Government (B2G)",
    amount: invoices
      .filter((i) => !B2B_CLIENTS.has(i.client))
      .reduce((sum, i) => sum + i.amount, 0),
  },
  {
    type: "Private (B2B)",
    amount: invoices
      .filter((i) => B2B_CLIENTS.has(i.client))
      .reduce((sum, i) => sum + i.amount, 0),
  },
];

export const revenueThisYear = monthlyRevenue.reduce(
  (sum, m) => sum + m.revenue,
  0,
);
const yearTarget = monthlyRevenue.reduce((sum, m) => sum + m.target, 0);
export const yearTargetPct = Math.round((revenueThisYear / yearTarget) * 100);

const totalRevenueAllClients = revenueByClientType.reduce(
  (sum, c) => sum + c.amount,
  0,
);
export const governmentSharePct = Math.round(
  (revenueByClientType.find((c) => c.type === "Government (B2G)")!.amount /
    totalRevenueAllClients) *
    100,
);

export const topProductLine = revenueByProductLine[0].productLine;

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
