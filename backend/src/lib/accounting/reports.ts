/**
 * Every accounting report reduces to a filtered SUM(debit)/SUM(credit) over
 * posted journal_entry_lines — see 0007_reporting_views.sql's
 * v_posted_lines/v_account_balances/fn_trial_balance/fn_project_pl. This
 * file is the read side of the accounting module (posting.ts is the write
 * side, coa.ts resolves references) — a new report is a new query here,
 * not a new table.
 */
import { supabase } from "../supabase.js";

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

export async function fetchTrialBalance(asOf?: string): Promise<TrialBalanceRow[]> {
  const { data, error } = await supabase.rpc("fn_trial_balance", { p_as_of: asOf ?? undefined });
  if (error) throw new Error(error.message);
  return data.map((r) => ({
    accountId: r.account_id,
    accountCode: r.account_code,
    accountName: r.account_name,
    accountType: r.account_type,
    accountSubtype: r.account_subtype,
    debit: r.debit,
    credit: r.credit,
    balance: r.balance,
  }));
}

export interface ProjectPLRow {
  revenue: number;
  cost: number;
  profit: number;
}

export async function fetchProjectPL(projectId: string, asOf?: string): Promise<ProjectPLRow> {
  const { data, error } = await supabase.rpc("fn_project_pl", {
    p_project_id: projectId,
    p_as_of: asOf ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data[0] ?? { revenue: 0, cost: 0, profit: 0 };
}

export interface GeneralLedgerFilters {
  accountId?: string;
  projectId?: string;
  partnerId?: string;
  from?: string;
  to?: string;
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

export async function fetchGeneralLedger(filters: GeneralLedgerFilters = {}): Promise<GeneralLedgerLine[]> {
  let query = supabase
    .from("v_posted_lines")
    .select(
      "line_id, journal_entry_id, entry_number, journal_code, accounting_date, account_code, account_name, line_description, debit, credit, partner_id, project_id, source_type, source_id",
    )
    .order("accounting_date")
    .order("entry_number");

  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.partnerId) query = query.eq("partner_id", filters.partnerId);
  if (filters.from) query = query.gte("accounting_date", filters.from);
  if (filters.to) query = query.lte("accounting_date", filters.to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data.map((r) => ({
    lineId: r.line_id,
    journalEntryId: r.journal_entry_id,
    entryNumber: r.entry_number,
    journalCode: r.journal_code,
    accountingDate: r.accounting_date,
    accountCode: r.account_code,
    accountName: r.account_name,
    description: r.line_description,
    debit: r.debit,
    credit: r.credit,
    partnerId: r.partner_id,
    projectId: r.project_id,
    sourceType: r.source_type,
    sourceId: r.source_id,
  }));
}

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

/**
 * The Balance Sheet and P&L reduce to sign-adjusted sums over the trial
 * balance, grouped by account_type/account_subtype — liability/equity/
 * revenue accounts carry a natural credit balance, so their trial-balance
 * `balance` (debit - credit) reads negative; this flips the sign back to
 * the conventional positive presentation.
 */
export async function fetchFinancialSummary(asOf?: string): Promise<FinancialSummary> {
  const rows = await fetchTrialBalance(asOf);
  const sumWhere = (pred: (r: TrialBalanceRow) => boolean) =>
    rows.filter(pred).reduce((sum, r) => sum + r.balance, 0);

  const assets = sumWhere((r) => r.accountType === "asset");
  const liabilities = -sumWhere((r) => r.accountType === "liability");
  const equity = -sumWhere((r) => r.accountType === "equity");
  const revenue = -sumWhere((r) => r.accountType === "revenue");
  const expenses = sumWhere((r) => r.accountType === "expense");
  const cash = sumWhere((r) => r.accountSubtype === "bank" || r.accountSubtype === "cash");
  const receivables = sumWhere((r) => r.accountSubtype === "receivable");
  const payables = -sumWhere((r) => r.accountSubtype === "payable");

  return {
    asOf: asOf ?? null,
    assets,
    liabilities,
    equity,
    revenue,
    expenses,
    netIncome: revenue - expenses,
    cash,
    receivables,
    payables,
  };
}

export interface AgingBucket {
  label: "current" | "1-30" | "31-60" | "61-90" | "90+";
  amount: number;
}

function bucketFor(daysOverdue: number): AgingBucket["label"] {
  if (daysOverdue <= 0) return "current";
  if (daysOverdue <= 30) return "1-30";
  if (daysOverdue <= 60) return "31-60";
  if (daysOverdue <= 90) return "61-90";
  return "90+";
}

/** Accounts receivable aging: open (non-voided, not fully paid) invoices bucketed by days past due_date. */
export async function fetchArAging(asOfIso: string): Promise<AgingBucket[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("amount, amount_paid, due_date, voided_at")
    .is("voided_at", null);
  if (error) throw new Error(error.message);

  const buckets: Record<AgingBucket["label"], number> = {
    current: 0,
    "1-30": 0,
    "31-60": 0,
    "61-90": 0,
    "90+": 0,
  };
  const asOf = new Date(`${asOfIso}T00:00:00Z`);
  for (const inv of data) {
    const outstanding = inv.amount - inv.amount_paid;
    if (outstanding <= 0) continue;
    const due = new Date(`${inv.due_date}T00:00:00Z`);
    const daysOverdue = Math.floor((asOf.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    buckets[bucketFor(daysOverdue)] += outstanding;
  }
  return (Object.keys(buckets) as AgingBucket["label"][]).map((label) => ({ label, amount: buckets[label] }));
}

/** Accounts payable aging: vendor bills (expenses with a due_date) bucketed by days past due, net of any payment allocations. */
export async function fetchApAging(asOfIso: string): Promise<AgingBucket[]> {
  const [expensesResult, allocationsResult] = await Promise.all([
    supabase.from("expenses").select("id, amount, due_date, voided_at").not("due_date", "is", null),
    supabase.from("payment_allocations").select("expense_id, amount").not("expense_id", "is", null),
  ]);
  if (expensesResult.error) throw new Error(expensesResult.error.message);
  if (allocationsResult.error) throw new Error(allocationsResult.error.message);

  const paidByExpense = new Map<string, number>();
  for (const a of allocationsResult.data) {
    if (!a.expense_id) continue;
    paidByExpense.set(a.expense_id, (paidByExpense.get(a.expense_id) ?? 0) + a.amount);
  }

  const buckets: Record<AgingBucket["label"], number> = {
    current: 0,
    "1-30": 0,
    "31-60": 0,
    "61-90": 0,
    "90+": 0,
  };
  const asOf = new Date(`${asOfIso}T00:00:00Z`);
  for (const exp of expensesResult.data) {
    if (exp.voided_at || !exp.due_date) continue;
    const outstanding = exp.amount - (paidByExpense.get(exp.id) ?? 0);
    if (outstanding <= 0) continue;
    const due = new Date(`${exp.due_date}T00:00:00Z`);
    const daysOverdue = Math.floor((asOf.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    buckets[bucketFor(daysOverdue)] += outstanding;
  }
  return (Object.keys(buckets) as AgingBucket["label"][]).map((label) => ({ label, amount: buckets[label] }));
}

export interface DebtOutstandingRow {
  loanId: string;
  reference: string;
  lenderName: string;
  principalAmount: number;
  outstandingPrincipal: number;
  status: string;
  maturityDate: string | null;
}

/** Outstanding principal is never stored — it's Σ disbursement - Σ principal_repayment per loan. */
export async function fetchDebtOutstanding(): Promise<DebtOutstandingRow[]> {
  const [loansResult, txnsResult] = await Promise.all([
    supabase
      .from("loans")
      .select("id, reference, principal_amount, status, maturity_date, lender:partners!inner(name)"),
    supabase.from("loan_transactions").select("loan_id, type, amount"),
  ]);
  if (loansResult.error) throw new Error(loansResult.error.message);
  if (txnsResult.error) throw new Error(txnsResult.error.message);

  const outstandingByLoan = new Map<string, number>();
  for (const t of txnsResult.data) {
    const sign = t.type === "disbursement" ? 1 : t.type === "principal_repayment" ? -1 : 0;
    if (sign === 0) continue;
    outstandingByLoan.set(t.loan_id, (outstandingByLoan.get(t.loan_id) ?? 0) + sign * t.amount);
  }

  return (loansResult.data as unknown as {
    id: string;
    reference: string;
    principal_amount: number;
    status: string;
    maturity_date: string | null;
    lender: { name: string };
  }[]).map((loan) => ({
    loanId: loan.id,
    reference: loan.reference,
    lenderName: loan.lender.name,
    principalAmount: loan.principal_amount,
    outstandingPrincipal: outstandingByLoan.get(loan.id) ?? 0,
    status: loan.status,
    maturityDate: loan.maturity_date,
  }));
}
