import type { Role } from "./roles";

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

export type HealthStatus = "good" | "watch" | "action";

export interface HeadlineStat {
  id: string;
  label: string;
  value: number;
  status: HealthStatus;
  note: string;
  delta?: { text: string; direction: "up" | "down"; upIsGood: boolean };
}

export interface AttentionItem {
  id: string;
  severity: "critical" | "warning";
  message: string;
  suggestedAction: string;
}

export type InvoiceStatusKind = "void" | "paid" | "overdue" | "partially-paid" | "awaiting";

export interface InvoiceStatus {
  kind: InvoiceStatusKind;
  label: string;
  daysOverdue: number;
}

export interface Invoice {
  id: string;
  number: string;
  client: string;
  project: string;
  amount: number;
  amountPaid: number;
  outstanding: number;
  issuedDate: string;
  dueDate: string;
  paidDate?: string;
  status: InvoiceStatus;
}

export interface DashboardUnpaidInvoice {
  id: string;
  number: string;
  client: string;
  project: string;
  amount: number;
  outstanding: number;
  dueDate: string;
  status: InvoiceStatus;
}

export type BudgetHealthKind = "on-track" | "near-limit" | "over";

export interface BudgetHealth {
  kind: BudgetHealthKind;
  label: string;
  pctUsed: number;
  remaining: number;
}

export interface BudgetItem {
  id: string;
  name: string;
  subtitle?: string;
  budget: number;
  spent: number;
  health: BudgetHealth;
}

export type ProjectHealthKind = "over-budget" | "near-billing" | "on-schedule";

export interface ProjectHealthInfo {
  kind: ProjectHealthKind;
  label: string;
  progressPct: number;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  productLine: string;
  contractValue: number;
  billedToDate: number;
  budget?: number;
  spent?: number;
  health: ProjectHealthInfo;
  isFlagged: boolean;
}

export interface ProjectStats {
  active: number;
  nearBilling: number;
  overBudget: number;
  pipelineValue: number;
  flaggedProject: string;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  target: number;
}

export interface BudgetTotals {
  budget: number;
  spent: number;
  remaining: number;
  pctUsed: number;
}

export interface DashboardResponse {
  asOf: string;
  period: string;
  headlineStats: HeadlineStat[];
  attentionItems: AttentionItem[];
  totalUnpaid: number;
  unpaidInvoices: DashboardUnpaidInvoice[];
  projectStats: ProjectStats;
}

export interface InvoicesResponse {
  asOf: string;
  invoices: Invoice[];
  summary: {
    totalUnpaid: number;
    totalOverdue: number;
    totalAwaiting: number;
    averageDaysToPay: number;
  };
}

export interface ProjectsResponse {
  projects: Project[];
  stats: ProjectStats;
}

export interface BudgetsResponse {
  period: string;
  categoryBudgets: BudgetItem[];
  projectBudgets: BudgetItem[];
  totals: BudgetTotals;
  budgetInsights: string[];
}

export interface TrendsResponse {
  monthlyRevenue: MonthlyRevenue[];
  revenueByProductLine: { productLine: string; amount: number }[];
  revenueByClientType: { type: string; amount: number }[];
  revenueThisYear: number;
  yearTargetPct: number;
  governmentSharePct: number;
  topProductLine: string;
  currentPeriod: string;
  currentTarget: number;
}

export interface NoteItem {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}

export interface NotesResponse {
  notes: NoteItem[];
}

export interface ProjectOption {
  id: string;
  name: string;
  client: string;
}
