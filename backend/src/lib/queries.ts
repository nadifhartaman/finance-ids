/**
 * All database reads live here; routes aggregate in TypeScript.
 * The dataset is tiny (tens of rows), so fetching whole tables and deriving
 * in code is the simplest correct thing. If data grows, the upgrade path is
 * SQL views / RPC functions — change this file, not the routes.
 *
 * Scalar/enum types come from the generated schema (src/types/database.ts,
 * regenerate after every migration — see backend/CLAUDE.md) so a renamed
 * column or changed enum becomes a compile error here. Joined-select shapes
 * (project/client embeds below) are still hand-typed: supabase-js can't infer
 * multi-level PostgREST embeds from the generated types, so those two casts
 * stay — everything else type-checks against `Database` with no cast.
 */

import type { Database } from "../types/database.js";
import { supabase } from "./supabase.js";

type ExpenseCategory = Database["public"]["Enums"]["expense_category"];
type ClientType = Database["public"]["Enums"]["client_type"];
type UserRole = Database["public"]["Enums"]["user_role"];

export interface ProfileRow {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export async function fetchProfileById(id: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  amount: number;
  amount_paid: number;
  issued_date: string;
  due_date: string;
  paid_date: string | null;
  voided_at: string | null;
  status: InvoiceStatus;
  project: {
    id: string;
    name: string;
    product_line: string;
    client: { name: string; client_type: ClientType };
  };
}

export async function fetchInvoices(): Promise<InvoiceRow[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      `id, invoice_number, amount, amount_paid, issued_date, due_date, paid_date, voided_at, status,
       project:projects!inner ( id, name, product_line, client:partners!inner ( name, client_type ) )`,
    )
    .order("issued_date");
  if (error) throw error;
  return data as unknown as InvoiceRow[];
}

export interface InvoiceFactsRow {
  invoice_number: string;
  partner_id: string;
  project_id: string;
  amount: number;
  amount_paid: number;
  issued_date: string;
  due_date: string;
  paid_date: string | null;
  voided_at: string | null;
  status: InvoiceStatus;
}

/** Lightweight single-invoice read for capturing "before" state ahead of a write — see mutations.ts. */
export async function fetchInvoiceById(id: string): Promise<InvoiceFactsRow | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "invoice_number, partner_id, project_id, amount, amount_paid, issued_date, due_date, paid_date, voided_at, status",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface InvoiceDocumentRow {
  id: string;
  invoiceNumber: string;
  amount: number;
  amountPaid: number;
  issuedDate: string;
  dueDate: string;
  paidDate: string | null;
  voidedAt: string | null;
  status: InvoiceStatus;
  postedAt: string | null;
  projectId: string;
  projectName: string;
  clientName: string;
}

/** Joined single-invoice read for the document detail/edit page (my-app's /money-in/invoices/[id]). */
export async function fetchInvoiceDocumentById(id: string): Promise<InvoiceDocumentRow | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      `id, invoice_number, amount, amount_paid, issued_date, due_date, paid_date, voided_at, status, posted_at, project_id,
       project:projects!inner ( name, client:partners!inner ( name ) )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const r = data as unknown as {
    id: string;
    invoice_number: string;
    amount: number;
    amount_paid: number;
    issued_date: string;
    due_date: string;
    paid_date: string | null;
    voided_at: string | null;
    status: InvoiceStatus;
    posted_at: string | null;
    project_id: string;
    project: { name: string; client: { name: string } };
  };

  return {
    id: r.id,
    invoiceNumber: r.invoice_number,
    amount: r.amount,
    amountPaid: r.amount_paid,
    issuedDate: r.issued_date,
    dueDate: r.due_date,
    paidDate: r.paid_date,
    voidedAt: r.voided_at,
    status: r.status,
    postedAt: r.posted_at,
    projectId: r.project_id,
    projectName: r.project.name,
    clientName: r.project.client.name,
  };
}

export interface ClientRow {
  id: string;
  name: string;
  client_type: ClientType;
}

export async function fetchClients(): Promise<ClientRow[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, client_type")
    .order("name");
  if (error) throw error;
  // The `clients` view is filtered to partners.is_customer — every row it
  // returns went through a create path that requires client_type, so this
  // is never actually null in practice; the column is only nullable at the
  // partners level because vendors/employees/lenders don't have one.
  return data.map((row) => ({ ...row, client_type: row.client_type as ClientType }));
}

export interface ProjectRow {
  id: string;
  name: string;
  product_line: string;
  contract_value: number;
  budget: number | null;
  is_flagged: boolean;
  client: { name: string; client_type: ClientType };
}

export async function fetchProjects(): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(
      `id, name, product_line, contract_value, budget, is_flagged,
       client:partners!inner ( name, client_type )`,
    )
    .order("name");
  if (error) throw error;
  return data as unknown as ProjectRow[];
}

/** Lightweight single-project read for capturing "before" state ahead of a write — see mutations.ts. */
export async function fetchProjectById(id: string): Promise<{
  name: string;
  product_line: string;
  contract_value: number;
  budget: number | null;
  is_flagged: boolean;
  partner_id: string;
} | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("name, product_line, contract_value, budget, is_flagged, partner_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** True if this project has any invoice or expense recorded — financial facts that block a delete. */
export async function projectHasFinancialHistory(id: string): Promise<boolean> {
  const [{ count: invoiceCount, error: invoiceError }, { count: expenseCount, error: expenseError }] =
    await Promise.all([
      supabase.from("invoices").select("id", { count: "exact", head: true }).eq("project_id", id),
      supabase.from("expenses").select("id", { count: "exact", head: true }).eq("project_id", id),
    ]);
  if (invoiceError) throw invoiceError;
  if (expenseError) throw expenseError;
  return (invoiceCount ?? 0) > 0 || (expenseCount ?? 0) > 0;
}

export interface ExpenseRow {
  category: ExpenseCategory;
  project_id: string | null;
  amount: number;
  spent_on: string;
}

export async function fetchExpenses(): Promise<ExpenseRow[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("category, project_id, amount, spent_on");
  if (error) throw error;
  return data;
}

export interface ExpenseFactsRow {
  category: ExpenseCategory;
  project_id: string | null;
  partner_id: string | null;
  description: string;
  amount: number;
  spent_on: string;
  due_date: string | null;
  voided_at: string | null;
  status: Database["public"]["Enums"]["expense_status"];
  document_number: string | null;
  paid_from_account_id: string | null;
}

/** Lightweight single-expense read for capturing "before" state ahead of a write — see mutations.ts. */
export async function fetchExpenseById(id: string): Promise<ExpenseFactsRow | null> {
  const { data, error } = await supabase
    .from("expenses")
    .select(
      "category, project_id, partner_id, description, amount, spent_on, due_date, voided_at, status, document_number, paid_from_account_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface ExpenseDocumentRow {
  id: string;
  documentNumber: string | null;
  category: ExpenseCategory;
  status: Database["public"]["Enums"]["expense_status"];
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

/** The expense document list — the transaction-level view that never existed before. Paginated the same way fetchJournalEntries is (an unbounded list over a growing table). */
export async function fetchExpenseDocuments(params: {
  from?: string;
  to?: string;
  category?: ExpenseCategory;
  status?: Database["public"]["Enums"]["expense_status"];
  page?: number;
  limit?: number;
}): Promise<{ data: ExpenseDocumentRow[]; page: number; limit: number; total: number }> {
  const page = params.page && params.page > 0 ? params.page : 1;
  const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 20;
  const rangeStart = (page - 1) * limit;
  const rangeEnd = rangeStart + limit - 1;

  let query = supabase
    .from("expenses")
    .select(
      "id, document_number, category, status, description, amount, spent_on, due_date, voided_at, partner_id, project_id, paid_from_account_id, partner:partners ( name ), project:projects ( name ), paid_from:accounts!expenses_paid_from_account_id_fkey ( name )",
      { count: "exact" },
    )
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false })
    .range(rangeStart, rangeEnd);

  if (params.from) query = query.gte("spent_on", params.from);
  if (params.to) query = query.lte("spent_on", params.to);
  if (params.category) query = query.eq("category", params.category);
  if (params.status) query = query.eq("status", params.status);

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = data as unknown as {
    id: string;
    document_number: string | null;
    category: ExpenseCategory;
    status: Database["public"]["Enums"]["expense_status"];
    description: string;
    amount: number;
    spent_on: string;
    due_date: string | null;
    voided_at: string | null;
    partner_id: string | null;
    project_id: string | null;
    paid_from_account_id: string | null;
    partner: { name: string } | null;
    project: { name: string } | null;
    paid_from: { name: string } | null;
  }[];

  return {
    data: rows.map((r) => ({
      id: r.id,
      documentNumber: r.document_number,
      category: r.category,
      status: r.status,
      description: r.description,
      amount: r.amount,
      spentOn: r.spent_on,
      dueDate: r.due_date,
      voidedAt: r.voided_at,
      partnerId: r.partner_id,
      partnerName: r.partner?.name ?? null,
      projectId: r.project_id,
      projectName: r.project?.name ?? null,
      paidFromAccountId: r.paid_from_account_id,
      paidFromAccountName: r.paid_from?.name ?? null,
    })),
    page,
    limit,
    total: count ?? 0,
  };
}

/** Same shape as one row of fetchExpenseDocuments, for the document detail/edit page. */
export async function fetchExpenseDocumentById(id: string): Promise<ExpenseDocumentRow | null> {
  const { data, error } = await supabase
    .from("expenses")
    .select(
      "id, document_number, category, status, description, amount, spent_on, due_date, voided_at, partner_id, project_id, paid_from_account_id, partner:partners ( name ), project:projects ( name ), paid_from:accounts!expenses_paid_from_account_id_fkey ( name )",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const r = data as unknown as {
    id: string;
    document_number: string | null;
    category: ExpenseCategory;
    status: Database["public"]["Enums"]["expense_status"];
    description: string;
    amount: number;
    spent_on: string;
    due_date: string | null;
    voided_at: string | null;
    partner_id: string | null;
    project_id: string | null;
    paid_from_account_id: string | null;
    partner: { name: string } | null;
    project: { name: string } | null;
    paid_from: { name: string } | null;
  };

  return {
    id: r.id,
    documentNumber: r.document_number,
    category: r.category,
    status: r.status,
    description: r.description,
    amount: r.amount,
    spentOn: r.spent_on,
    dueDate: r.due_date,
    voidedAt: r.voided_at,
    partnerId: r.partner_id,
    partnerName: r.partner?.name ?? null,
    projectId: r.project_id,
    projectName: r.project?.name ?? null,
    paidFromAccountId: r.paid_from_account_id,
    paidFromAccountName: r.paid_from?.name ?? null,
  };
}

/** Outstanding balance on a vendor bill: amount minus everything allocated to it via payment_allocations. */
export async function fetchExpenseOutstanding(expenseId: string): Promise<number> {
  const [{ data: expense, error: expenseError }, { data: allocations, error: allocationsError }] =
    await Promise.all([
      supabase.from("expenses").select("amount").eq("id", expenseId).single(),
      supabase.from("payment_allocations").select("amount").eq("expense_id", expenseId),
    ]);
  if (expenseError) throw expenseError;
  if (allocationsError) throw allocationsError;
  const paid = allocations.reduce((s, a) => s + a.amount, 0);
  return expense.amount - paid;
}

/** Outstanding principal on a loan: Σ disbursement - Σ principal_repayment — same formula fetchDebtOutstanding uses. */
export async function fetchLoanOutstanding(loanId: string): Promise<number> {
  const { data, error } = await supabase
    .from("loan_transactions")
    .select("type, amount")
    .eq("loan_id", loanId);
  if (error) throw error;
  return data.reduce((s, t) => {
    if (t.type === "disbursement") return s + t.amount;
    if (t.type === "principal_repayment") return s - t.amount;
    return s;
  }, 0);
}

export interface PartnerRow {
  id: string;
  name: string;
  client_type: ClientType | null;
  is_customer: boolean;
  is_vendor: boolean;
  is_employee: boolean;
  is_lender: boolean;
  is_active: boolean;
  tax_id: string | null;
}

type PartnerRole = "customer" | "vendor" | "employee" | "lender";

const PARTNER_ROLE_COLUMN: Record<PartnerRole, "is_customer" | "is_vendor" | "is_employee" | "is_lender"> = {
  customer: "is_customer",
  vendor: "is_vendor",
  employee: "is_employee",
  lender: "is_lender",
};

export async function fetchPartners(role?: PartnerRole): Promise<PartnerRow[]> {
  let query = supabase
    .from("partners")
    .select("id, name, client_type, is_customer, is_vendor, is_employee, is_lender, is_active, tax_id")
    .order("name");
  if (role) query = query.eq(PARTNER_ROLE_COLUMN[role], true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export interface CategoryBudgetRow {
  category: ExpenseCategory;
  period: string;
  planned_amount: number;
}

export async function fetchCategoryBudgets(period: string): Promise<CategoryBudgetRow[]> {
  const { data, error } = await supabase
    .from("category_budgets")
    .select("category, period, planned_amount")
    .eq("period", period);
  if (error) throw error;
  return data;
}

/** Every month a category plan exists for (may contain duplicates across categories). */
export async function fetchCategoryBudgetPeriods(): Promise<string[]> {
  const { data, error } = await supabase.from("category_budgets").select("period");
  if (error) throw error;
  return data.map((row) => row.period);
}

export interface RevenueTargetRow {
  period: string;
  target_amount: number;
}

export async function fetchRevenueTargets(): Promise<RevenueTargetRow[]> {
  const { data, error } = await supabase
    .from("revenue_targets")
    .select("period, target_amount")
    .order("period");
  if (error) throw error;
  return data;
}

export interface CashSnapshotRow {
  as_of: string;
  amount: number;
}

/** Newest first; index 0 is "cash on hand", index 1 the previous snapshot. */
export async function fetchCashSnapshots(limit = 2): Promise<CashSnapshotRow[]> {
  const { data, error } = await supabase
    .from("cash_snapshots")
    .select("as_of, amount")
    .order("as_of", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export interface PageNote {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}

/** Dashboard-only notes (entity="page", entity_id null) — no per-page scoping yet. */
export async function fetchPageNotes(): Promise<PageNote[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("id, body, created_at, author:profiles!inner(full_name)")
    .eq("entity", "page")
    .is("entity_id", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as { id: string; body: string; created_at: string; author: { full_name: string } }[]).map(
    (n) => ({ id: n.id, body: n.body, authorName: n.author.full_name, createdAt: n.created_at }),
  );
}
