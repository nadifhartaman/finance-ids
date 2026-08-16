/**
 * Every accounting report reduces to a filtered SUM(debit)/SUM(credit) over
 * posted journal_entry_lines — see 0007_reporting_views.sql's
 * v_posted_lines/v_account_balances/fn_trial_balance/fn_project_pl. This
 * file is the read side of the accounting module (posting.ts is the write
 * side, coa.ts resolves references) — a new report is a new query here,
 * not a new table.
 */
import { supabase } from "../supabase.js";
import type { Database } from "../../types/database.js";
import { resolveAccount, expenseAccountKey } from "./coa.js";

type LoanStatus = Database["public"]["Enums"]["loan_status"];
type ExpenseCategory = Database["public"]["Enums"]["expense_category"];

const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = ["payroll", "operations", "project_costs"];

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

export interface ProjectProfitabilityRow {
  projectId: string;
  projectName: string;
  clientName: string;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number | null;
}

/** All-projects profitability leaderboard — fn_project_pl only takes one project id, so a top-N view means one aggregation pass over every project-tagged posted line instead of N round trips. */
export async function fetchAllProjectPL(asOf?: string, limit = 10): Promise<ProjectProfitabilityRow[]> {
  let linesQuery = supabase
    .from("v_posted_lines")
    .select("project_id, account_type, debit, credit")
    .not("project_id", "is", null);
  if (asOf) linesQuery = linesQuery.lte("accounting_date", asOf);
  const { data: lines, error: linesError } = await linesQuery;
  if (linesError) throw new Error(linesError.message);
  console.log(`[accounting.project-profitability] fetched ${lines.length} rows${asOf ? ` as of ${asOf}` : ""}`);

  const byProject = new Map<string, { revenue: number; cost: number }>();
  for (const line of lines) {
    const projectId = line.project_id;
    if (!projectId) continue;
    const bucket = byProject.get(projectId) ?? { revenue: 0, cost: 0 };
    if (line.account_type === "revenue") bucket.revenue += line.credit - line.debit;
    else if (line.account_type === "expense") bucket.cost += line.debit - line.credit;
    byProject.set(projectId, bucket);
  }

  if (byProject.size === 0) return [];

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, name, client:partners!inner ( name )")
    .in("id", [...byProject.keys()]);
  if (projectsError) throw new Error(projectsError.message);

  const rows = (projects as unknown as { id: string; name: string; client: { name: string } }[]).map((p) => {
    const bucket = byProject.get(p.id) ?? { revenue: 0, cost: 0 };
    const profit = bucket.revenue - bucket.cost;
    return {
      projectId: p.id,
      projectName: p.name,
      clientName: p.client.name,
      revenue: bucket.revenue,
      cost: bucket.cost,
      profit,
      marginPct: bucket.revenue > 0 ? (profit / bucket.revenue) * 100 : null,
    };
  });

  return rows.sort((a, b) => b.profit - a.profit).slice(0, limit);
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

export interface MonthlyPLRow {
  month: string;
  revenue: number;
  expenses: number;
  netIncome: number;
}

function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  const cursor = new Date(`${from.slice(0, 7)}-01T00:00:00Z`);
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00Z`);
  while (cursor <= end) {
    months.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

/** Revenue/expenses by month over [from, to] — bounded, unlike /summary's inception-to-date asOf. Months with no postings are emitted as zeros for a continuous chart axis. */
export async function fetchMonthlyPL(from: string, to: string): Promise<MonthlyPLRow[]> {
  const { data, error } = await supabase
    .from("v_posted_lines")
    .select("accounting_date, account_type, debit, credit")
    .in("account_type", ["revenue", "expense"])
    .gte("accounting_date", from)
    .lte("accounting_date", to);
  if (error) throw new Error(error.message);
  console.log(`[accounting.pl-monthly] fetched ${data.length} rows for ${from}..${to}`);

  const byMonth = new Map<string, { revenue: number; expenses: number }>();
  for (const row of data) {
    const month = `${row.accounting_date.slice(0, 7)}-01`;
    const bucket = byMonth.get(month) ?? { revenue: 0, expenses: 0 };
    if (row.account_type === "revenue") bucket.revenue += row.credit - row.debit;
    else bucket.expenses += row.debit - row.credit;
    byMonth.set(month, bucket);
  }

  return monthsBetween(from, to).map((month) => {
    const bucket = byMonth.get(month) ?? { revenue: 0, expenses: 0 };
    return { month, revenue: bucket.revenue, expenses: bucket.expenses, netIncome: bucket.revenue - bucket.expenses };
  });
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

function dayBefore(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function weekStart(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

function bucketKey(dateIso: string, granularity: CashFlowGranularity): string {
  if (granularity === "day") return dateIso;
  if (granularity === "month") return `${dateIso.slice(0, 7)}-01`;
  return weekStart(dateIso);
}

function enumerateBuckets(from: string, to: string, granularity: CashFlowGranularity): string[] {
  if (granularity === "month") return monthsBetween(from, to);

  const step = granularity === "day" ? 1 : 7;
  const keys: string[] = [];
  const cursor = new Date(`${granularity === "week" ? weekStart(from) : from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + step);
  }
  return keys;
}

/** Cash movement over a bounded [from, to] range, bucketed by day/week/month — there is no cash-flow view/function yet, so this reduces to Σ debit/credit on bank+cash subtype lines, same sign convention as fetchFinancialSummary's `cash`. */
export async function fetchCashFlow(
  from: string,
  to: string,
  granularity: CashFlowGranularity = "day",
): Promise<CashFlowResponse> {
  const openingRows = await fetchTrialBalance(dayBefore(from));
  const openingCash = openingRows
    .filter((r) => r.accountSubtype === "bank" || r.accountSubtype === "cash")
    .reduce((sum, r) => sum + r.balance, 0);

  const { data, error } = await supabase
    .from("v_posted_lines")
    .select("accounting_date, debit, credit")
    .in("account_subtype", ["bank", "cash"])
    .gte("accounting_date", from)
    .lte("accounting_date", to);
  if (error) throw new Error(error.message);
  console.log(`[accounting.cash-flow] fetched ${data.length} rows for ${from}..${to} (${granularity})`);

  const byBucket = new Map<string, { inflow: number; outflow: number }>();
  for (const row of data) {
    const key = bucketKey(row.accounting_date, granularity);
    const bucket = byBucket.get(key) ?? { inflow: 0, outflow: 0 };
    bucket.inflow += row.debit;
    bucket.outflow += row.credit;
    byBucket.set(key, bucket);
  }

  let running = openingCash;
  const buckets: CashFlowBucket[] = enumerateBuckets(from, to, granularity).map((periodStart) => {
    const bucket = byBucket.get(periodStart) ?? { inflow: 0, outflow: 0 };
    const net = bucket.inflow - bucket.outflow;
    running += net;
    return { periodStart, inflow: bucket.inflow, outflow: bucket.outflow, net, closing: running };
  });

  const totalInflow = buckets.reduce((sum, b) => sum + b.inflow, 0);
  const totalOutflow = buckets.reduce((sum, b) => sum + b.outflow, 0);

  return {
    from,
    to,
    granularity,
    openingCash,
    closingCash: buckets.length ? buckets[buckets.length - 1]!.closing : openingCash,
    totalInflow,
    totalOutflow,
    netMovement: totalInflow - totalOutflow,
    buckets,
  };
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export interface JournalEntryFilters {
  from?: string;
  to?: string;
  journalCode?: string;
  /** Omitted = "posted", matching every existing caller's expectation before drafts existed. */
  status?: "draft" | "posted" | "cancelled";
}

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

/** Recent journal entries, newest first, server-paginated — the only unbounded list in the accounting core (/general-ledger returns raw lines, not entries, and has no limit), so this is the one report that needs a real page/limit contract. */
export async function fetchJournalEntries(
  filters: JournalEntryFilters,
  page: number,
  limit: number,
): Promise<Paginated<JournalEntryRow>> {
  let journalId: string | undefined;
  if (filters.journalCode) {
    const { data: journal, error: journalError } = await supabase
      .from("journals")
      .select("id")
      .eq("code", filters.journalCode)
      .maybeSingle();
    if (journalError) throw new Error(journalError.message);
    if (!journal) return { data: [], page, limit, total: 0 };
    journalId = journal.id;
  }

  let query = supabase
    .from("journal_entries")
    .select(
      "id, entry_number, accounting_date, description, reference, source_type, status, journal:journals!inner ( code, name )",
      { count: "exact" },
    )
    .eq("status", filters.status ?? "posted")
    .order("accounting_date", { ascending: false })
    .order("entry_number", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (filters.from) query = query.gte("accounting_date", filters.from);
  if (filters.to) query = query.lte("accounting_date", filters.to);
  if (journalId) query = query.eq("journal_id", journalId);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  console.log(`[accounting.entries] fetched ${data.length} entries (page ${page}, total ${count ?? 0})`);

  const entries = data as unknown as {
    id: string;
    entry_number: string;
    accounting_date: string;
    description: string;
    reference: string | null;
    source_type: string;
    status: string;
    journal: { code: string; name: string };
  }[];

  if (entries.length === 0) {
    return { data: [], page, limit, total: count ?? 0 };
  }

  const { data: lines, error: linesError } = await supabase
    .from("journal_entry_lines")
    .select("journal_entry_id, debit")
    .in(
      "journal_entry_id",
      entries.map((e) => e.id),
    );
  if (linesError) throw new Error(linesError.message);

  const amountByEntry = new Map<string, number>();
  for (const line of lines) {
    amountByEntry.set(line.journal_entry_id, (amountByEntry.get(line.journal_entry_id) ?? 0) + line.debit);
  }

  const rows: JournalEntryRow[] = entries.map((e) => ({
    id: e.id,
    entryNumber: e.entry_number,
    accountingDate: e.accounting_date,
    journalCode: e.journal.code,
    journalName: e.journal.name,
    description: e.description,
    reference: e.reference,
    sourceType: e.source_type,
    status: e.status,
    amount: amountByEntry.get(e.id) ?? 0,
  }));

  return { data: rows, page, limit, total: count ?? 0 };
}

export interface JournalEntryLineDetail {
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
  lines: JournalEntryLineDetail[];
}

/** One entry with its lines, names resolved — the journal-entry editor's detail/edit view. `/entries` (above) intentionally omits lines; a list of 10-100 entries doesn't need every line eagerly joined. */
export async function fetchJournalEntryById(id: string): Promise<JournalEntryDetail | null> {
  const { data: entry, error: entryError } = await supabase
    .from("journal_entries")
    .select(
      "id, entry_number, journal_id, accounting_date, reference, description, status, source_type, source_id, reversal_of_id, journal:journals!inner ( code, name )",
    )
    .eq("id", id)
    .maybeSingle();
  if (entryError) throw new Error(entryError.message);
  if (!entry) return null;

  const { data: lines, error: linesError } = await supabase
    .from("journal_entry_lines")
    .select(
      "id, line_no, account_id, partner_id, project_id, description, debit, credit, account:accounts!inner ( code, name ), partner:partners ( name ), project:projects ( name )",
    )
    .eq("journal_entry_id", id)
    .order("line_no");
  if (linesError) throw new Error(linesError.message);

  const journal = entry.journal as unknown as { code: string; name: string };
  const lineRows = lines as unknown as {
    id: string;
    line_no: number;
    account_id: string;
    partner_id: string | null;
    project_id: string | null;
    description: string | null;
    debit: number;
    credit: number;
    account: { code: string; name: string };
    partner: { name: string } | null;
    project: { name: string } | null;
  }[];

  return {
    id: entry.id,
    entryNumber: entry.entry_number,
    journalId: entry.journal_id,
    journalCode: journal.code,
    journalName: journal.name,
    accountingDate: entry.accounting_date,
    reference: entry.reference,
    description: entry.description,
    status: entry.status,
    sourceType: entry.source_type,
    sourceId: entry.source_id,
    reversalOfId: entry.reversal_of_id,
    lines: lineRows.map((l) => ({
      id: l.id,
      lineNo: l.line_no,
      accountId: l.account_id,
      accountCode: l.account.code,
      accountName: l.account.name,
      partnerId: l.partner_id,
      partnerName: l.partner?.name ?? null,
      projectId: l.project_id,
      projectName: l.project?.name ?? null,
      description: l.description,
      debit: l.debit,
      credit: l.credit,
    })),
  };
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

interface PartnerAgingAccumulator {
  data: Map<string, PartnerAgingRow>;
  add(partnerId: string, partnerName: string, label: AgingBucket["label"], amount: number): void;
  toSorted(): PartnerAgingRow[];
}

function newPartnerAgingAccumulator(): PartnerAgingAccumulator {
  const data = new Map<string, PartnerAgingRow>();
  return {
    data,
    add(partnerId, partnerName, label, amount) {
      const row =
        data.get(partnerId) ??
        ({ partnerId, partnerName, total: 0, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 } as PartnerAgingRow);
      row.total += amount;
      if (label === "current") row.current += amount;
      else if (label === "1-30") row.d1_30 += amount;
      else if (label === "31-60") row.d31_60 += amount;
      else if (label === "61-90") row.d61_90 += amount;
      else row.d90plus += amount;
      data.set(partnerId, row);
    },
    toSorted() {
      return [...data.values()].sort((a, b) => b.total - a.total);
    },
  };
}

export interface AgingResult {
  buckets: AgingBucket[];
  partners: PartnerAgingRow[];
}

/** Accounts receivable aging: open (non-voided, not fully paid) invoices bucketed by days past due_date, both overall and per customer. */
export async function fetchArAging(asOfIso: string): Promise<AgingResult> {
  const { data, error } = await supabase
    .from("invoices")
    .select("amount, amount_paid, due_date, voided_at, partner_id, partner:partners!inner ( name )")
    .is("voided_at", null)
    .eq("status", "posted");
  if (error) throw new Error(error.message);
  console.log(`[accounting.ar-aging] fetched ${data.length} invoices as of ${asOfIso}`);

  const buckets: Record<AgingBucket["label"], number> = {
    current: 0,
    "1-30": 0,
    "31-60": 0,
    "61-90": 0,
    "90+": 0,
  };
  const partnerAcc = newPartnerAgingAccumulator();
  const asOf = new Date(`${asOfIso}T00:00:00Z`);
  for (const inv of data as unknown as {
    amount: number;
    amount_paid: number;
    due_date: string;
    partner_id: string;
    partner: { name: string };
  }[]) {
    const outstanding = inv.amount - inv.amount_paid;
    if (outstanding <= 0) continue;
    const due = new Date(`${inv.due_date}T00:00:00Z`);
    const daysOverdue = Math.floor((asOf.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    const label = bucketFor(daysOverdue);
    buckets[label] += outstanding;
    partnerAcc.add(inv.partner_id, inv.partner.name, label, outstanding);
  }
  return {
    buckets: (Object.keys(buckets) as AgingBucket["label"][]).map((label) => ({ label, amount: buckets[label] })),
    partners: partnerAcc.toSorted(),
  };
}

/** Accounts payable aging: vendor bills (expenses with a due_date) bucketed by days past due, net of any payment allocations, both overall and per vendor. */
export async function fetchApAging(asOfIso: string): Promise<AgingResult> {
  const [expensesResult, allocationsResult] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, amount, due_date, voided_at, partner_id, partner:partners ( name )")
      .not("due_date", "is", null),
    supabase.from("payment_allocations").select("expense_id, amount").not("expense_id", "is", null),
  ]);
  if (expensesResult.error) throw new Error(expensesResult.error.message);
  if (allocationsResult.error) throw new Error(allocationsResult.error.message);
  console.log(`[accounting.ap-aging] fetched ${expensesResult.data.length} vendor bills as of ${asOfIso}`);

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
  const partnerAcc = newPartnerAgingAccumulator();
  const asOf = new Date(`${asOfIso}T00:00:00Z`);
  for (const exp of expensesResult.data as unknown as {
    id: string;
    amount: number;
    due_date: string | null;
    voided_at: string | null;
    partner_id: string | null;
    partner: { name: string } | null;
  }[]) {
    if (exp.voided_at || !exp.due_date || !exp.partner_id || !exp.partner) continue;
    const outstanding = exp.amount - (paidByExpense.get(exp.id) ?? 0);
    if (outstanding <= 0) continue;
    const due = new Date(`${exp.due_date}T00:00:00Z`);
    const daysOverdue = Math.floor((asOf.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    const label = bucketFor(daysOverdue);
    buckets[label] += outstanding;
    partnerAcc.add(exp.partner_id, exp.partner.name, label, outstanding);
  }
  return {
    buckets: (Object.keys(buckets) as AgingBucket["label"][]).map((label) => ({ label, amount: buckets[label] })),
    partners: partnerAcc.toSorted(),
  };
}

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

/** Outstanding principal is never stored — it's Σ disbursement - Σ principal_repayment per loan. `status` filters out settled/cancelled loans when set, since callers otherwise get every loan the company has ever had. */
export async function fetchDebtOutstanding(status?: LoanStatus): Promise<DebtOutstandingRow[]> {
  let loansQuery = supabase
    .from("loans")
    .select("id, reference, principal_amount, status, maturity_date, lender:partners!inner(name)");
  if (status) loansQuery = loansQuery.eq("status", status);

  const [loansResult, txnsResult] = await Promise.all([
    loansQuery,
    supabase.from("loan_transactions").select("loan_id, type, amount"),
  ]);
  if (loansResult.error) throw new Error(loansResult.error.message);
  if (txnsResult.error) throw new Error(txnsResult.error.message);
  console.log(`[accounting.debt] fetched ${loansResult.data.length} loans, ${txnsResult.data.length} transactions`);

  const outstandingByLoan = new Map<string, number>();
  const interestPaidByLoan = new Map<string, number>();
  for (const t of txnsResult.data) {
    if (t.type === "disbursement") {
      outstandingByLoan.set(t.loan_id, (outstandingByLoan.get(t.loan_id) ?? 0) + t.amount);
    } else if (t.type === "principal_repayment") {
      outstandingByLoan.set(t.loan_id, (outstandingByLoan.get(t.loan_id) ?? 0) - t.amount);
    } else if (t.type === "interest_payment") {
      interestPaidByLoan.set(t.loan_id, (interestPaidByLoan.get(t.loan_id) ?? 0) + t.amount);
    }
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
    interestPaid: interestPaidByLoan.get(loan.id) ?? 0,
    status: loan.status,
    maturityDate: loan.maturity_date,
  }));
}

/**
 * Spend per expense lane (payroll/operations/project_costs), summed straight
 * off each lane's ledger account — the same figure the journal-entry editor's
 * postings land in, so a manual entry against `Operational Expense` shows up
 * here exactly like a quick-form expense does. `from`/`to` omitted = all time.
 * Replaces summing the `expenses` table for "spent", which (a) can't see
 * manual journal entries and (b) doesn't net out voided expenses' reversals.
 */
export async function fetchExpenseByLane(
  from?: string,
  to?: string,
): Promise<Record<ExpenseCategory, number>> {
  const accountIds = await Promise.all(
    EXPENSE_CATEGORIES.map((cat) => resolveAccount(expenseAccountKey(cat))),
  );
  const accountIdToCategory = new Map(accountIds.map((id, i) => [id, EXPENSE_CATEGORIES[i]]));

  let query = supabase.from("v_posted_lines").select("account_id, debit, credit").in("account_id", accountIds);
  if (from) query = query.gte("accounting_date", from);
  if (to) query = query.lte("accounting_date", to);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  console.log(`[accounting.expense-by-lane] fetched ${data.length} rows${from ? ` for ${from}..${to ?? "now"}` : ""}`);

  const totals: Record<ExpenseCategory, number> = { payroll: 0, operations: 0, project_costs: 0 };
  for (const row of data) {
    const category = accountIdToCategory.get(row.account_id);
    if (!category) continue;
    totals[category] += row.debit - row.credit;
  }
  return totals;
}

/**
 * Project-cost spend per project, summed off the `Project Cost` ledger
 * account (same rationale as fetchExpenseByLane — ledger, not the `expenses`
 * table, so manual journal entries and voided-expense reversals both count
 * correctly). `from`/`to` omitted = all time, matching the "All time" budget
 * scope; bounded, it backs the per-project figures in a single month.
 */
export async function fetchProjectCostByRange(from?: string, to?: string): Promise<Map<string, number>> {
  const accountId = await resolveAccount(expenseAccountKey("project_costs"));

  let query = supabase
    .from("v_posted_lines")
    .select("project_id, debit, credit")
    .eq("account_id", accountId)
    .not("project_id", "is", null);
  if (from) query = query.gte("accounting_date", from);
  if (to) query = query.lte("accounting_date", to);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  console.log(`[accounting.project-cost] fetched ${data.length} rows${from ? ` for ${from}..${to ?? "now"}` : ""}`);

  const byProject = new Map<string, number>();
  for (const row of data) {
    if (!row.project_id) continue;
    byProject.set(row.project_id, (byProject.get(row.project_id) ?? 0) + (row.debit - row.credit));
  }
  return byProject;
}
