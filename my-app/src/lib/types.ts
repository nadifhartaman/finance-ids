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

/** The stored lifecycle stage, separate from the derived payment/overdue InvoiceStatus above. */
export type InvoiceDocStatus = "draft" | "posted" | "cancelled";

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
  documentStatus: InvoiceDocStatus;
}

/** GET /api/invoices/:id — the document detail/edit page's read, mirrors ExpenseDocument. */
export interface InvoiceDocument {
  id: string;
  invoiceNumber: string;
  amount: number;
  amountPaid: number;
  issuedDate: string;
  dueDate: string;
  paidDate: string | null;
  voidedAt: string | null;
  status: InvoiceDocStatus;
  postedAt: string | null;
  projectId: string;
  projectName: string;
  clientName: string;
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
  /** null when this scope has no plan to compare against (e.g. a month with
   * no plan set, or per-project spend inside a single month). */
  budget: number | null;
  spent: number;
  health: BudgetHealth | null;
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

export interface BudgetScope {
  kind: "month" | "all";
  period: string | null;
  label: string;
  isCurrent: boolean;
}

export interface BudgetMonthOption {
  period: string;
  label: string;
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
  scope: BudgetScope;
  availableMonths: BudgetMonthOption[];
  categoryBudgets: BudgetItem[];
  projectBudgets: BudgetItem[];
  totals: BudgetTotals;
  projectNote: string;
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

export type ExpenseCategory = "payroll" | "operations" | "project_costs";

export type ClientType = "government" | "private";

export interface ClientOption {
  id: string;
  name: string;
  clientType: ClientType;
}

export type ExpenseDocStatus = "draft" | "posted" | "cancelled";

export interface ExpenseDocument {
  id: string;
  documentNumber: string | null;
  category: ExpenseCategory;
  status: ExpenseDocStatus;
  description: string;
  amount: number;
  spentOn: string;
  dueDate: string | null;
  voidedAt: string | null;
  partnerId: string | null;
  partnerName: string | null;
  projectId: string | null;
  projectName: string | null;
  paidFromAccountId: string | null;
  paidFromAccountName: string | null;
}

export interface ExpenseDocumentsResponse {
  data: ExpenseDocument[];
  page: number;
  limit: number;
  total: number;
}

export interface PartnerOption {
  id: string;
  name: string;
  clientType: ClientType | null;
  isCustomer: boolean;
  isVendor: boolean;
  isEmployee: boolean;
  isLender: boolean;
  isActive: boolean;
  taxId: string | null;
}

export interface PartnersResponse {
  partners: PartnerOption[];
}

export interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
  parentId: string | null;
  isPostable: boolean;
  isActive: boolean;
}

export interface AccountsResponse {
  accounts: AccountOption[];
}

export interface AttachmentItem {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  viewUrl: string;
}

export interface ClientsResponse {
  clients: ClientOption[];
}

// ----------------------------------------------------------------------------
// Accounting — mirrors backend/src/lib/accounting/reports.ts response shapes.
// The ledger (journal_entries/journal_entry_lines) is the source of truth;
// these types describe read-only reports over it, nothing is derived
// client-side from invoice/expense/project totals.
// ----------------------------------------------------------------------------

export interface FinancialSummary {
  asOf: string | null;
  assets: number;
  liabilities: number;
  equity: number;
  revenue: number;
  expenses: number;
  netIncome: number;
  cash: number;
  receivables: number;
  payables: number;
}

export type AgingBucketLabel = "current" | "1-30" | "31-60" | "61-90" | "90+";

export interface AgingBucket {
  label: AgingBucketLabel;
  amount: number;
}

export interface PartnerAgingRow {
  partnerId: string;
  partnerName: string;
  total: number;
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90plus: number;
}

export interface AgingResponse {
  asOf: string;
  buckets: AgingBucket[];
  partners: PartnerAgingRow[];
}

export type LoanStatus = "active" | "settled" | "cancelled";

export interface DebtOutstandingRow {
  loanId: string;
  reference: string;
  lenderName: string;
  principalAmount: number;
  outstandingPrincipal: number;
  interestPaid: number;
  status: string;
  maturityDate: string | null;
}

export interface DebtResponse {
  loans: DebtOutstandingRow[];
}

export interface LoanInput {
  reference: string;
  lenderPartnerId: string;
  liabilityAccountId: string;
  principalAmount: number;
  interestRatePct?: number | null;
  startDate: string;
  maturityDate?: string | null;
}

export interface RepaymentInput {
  principalAmount?: number;
  interestAmount?: number;
  paymentDate: string;
}

export interface MonthlyPLRow {
  month: string;
  revenue: number;
  expenses: number;
  netIncome: number;
}

export interface PlMonthlyResponse {
  from: string;
  to: string;
  months: MonthlyPLRow[];
}

export type CashFlowGranularity = "day" | "week" | "month";

export interface CashFlowBucket {
  periodStart: string;
  inflow: number;
  outflow: number;
  net: number;
  closing: number;
}

export interface CashFlowResponse {
  from: string;
  to: string;
  granularity: CashFlowGranularity;
  openingCash: number;
  closingCash: number;
  totalInflow: number;
  totalOutflow: number;
  netMovement: number;
  buckets: CashFlowBucket[];
}

export interface ProjectProfitabilityRow {
  projectId: string;
  projectName: string;
  clientName: string;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number | null;
}

export interface ProjectProfitabilityResponse {
  asOf: string | null;
  projects: ProjectProfitabilityRow[];
}

// ----------------------------------------------------------------------------
// Statement reports (/reports/*) — Trial balance, income statement, general
// ledger, and journal entries. See backend/src/lib/accounting/reports.ts.
// ----------------------------------------------------------------------------

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  accountSubtype: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface TrialBalanceResponse {
  asOf: string | null;
  accounts: TrialBalanceRow[];
}

export interface IncomeStatementLine {
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface IncomeStatement {
  from: string;
  to: string;
  revenue: IncomeStatementLine[];
  expenses: IncomeStatementLine[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

export type JournalEntryStatus = "draft" | "posted" | "cancelled";

export interface JournalEntryRow {
  id: string;
  entryNumber: string;
  accountingDate: string;
  journalCode: string;
  journalName: string;
  description: string;
  reference: string | null;
  sourceType: string;
  status: string;
  amount: number;
}

export interface JournalEntriesResponse {
  data: JournalEntryRow[];
  page: number;
  limit: number;
  total: number;
}

export interface JournalEntryDetailLine {
  id: string;
  lineNo: number;
  accountId: string;
  accountCode: string;
  accountName: string;
  partnerId: string | null;
  partnerName: string | null;
  projectId: string | null;
  projectName: string | null;
  description: string | null;
  debit: number;
  credit: number;
}

export interface JournalEntryDetail {
  id: string;
  entryNumber: string;
  journalId: string;
  journalCode: string;
  journalName: string;
  accountingDate: string;
  reference: string | null;
  description: string;
  status: string;
  sourceType: string;
  sourceId: string | null;
  reversalOfId: string | null;
  lines: JournalEntryDetailLine[];
}

export interface GeneralLedgerLine {
  lineId: string;
  journalEntryId: string;
  entryNumber: string;
  journalCode: string;
  accountingDate: string;
  accountCode: string;
  accountName: string;
  description: string | null;
  debit: number;
  credit: number;
  partnerId: string | null;
  projectId: string | null;
  sourceType: string;
  sourceId: string | null;
}

export interface GeneralLedgerResponse {
  lines: GeneralLedgerLine[];
}

