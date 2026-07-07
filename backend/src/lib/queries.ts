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

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  amount: number;
  amount_paid: number;
  issued_date: string;
  due_date: string;
  paid_date: string | null;
  voided_at: string | null;
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
      `id, invoice_number, amount, amount_paid, issued_date, due_date, paid_date, voided_at,
       project:projects!inner ( id, name, product_line, client:clients!inner ( name, client_type ) )`,
    )
    .order("issued_date");
  if (error) throw error;
  return data as unknown as InvoiceRow[];
}

export interface InvoiceFactsRow {
  amount: number;
  amount_paid: number;
  issued_date: string;
  due_date: string;
  paid_date: string | null;
  voided_at: string | null;
}

/** Lightweight single-invoice read for capturing "before" state ahead of a write — see mutations.ts. */
export async function fetchInvoiceById(id: string): Promise<InvoiceFactsRow | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select("amount, amount_paid, issued_date, due_date, paid_date, voided_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
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
       client:clients!inner ( name, client_type )`,
    )
    .order("name");
  if (error) throw error;
  return data as unknown as ProjectRow[];
}

/** Lightweight single-project read for capturing "before" state ahead of a write — see mutations.ts. */
export async function fetchProjectById(
  id: string,
): Promise<{ budget: number | null; is_flagged: boolean } | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("budget, is_flagged")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
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
