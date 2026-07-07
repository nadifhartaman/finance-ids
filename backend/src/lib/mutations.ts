/**
 * Report-data writes (Phase 3 of .scratch/user-management/PRD.md) — kept
 * separate from queries.ts, which is documented as read-only reporting data
 * for the 5 dashboard pages.
 */
import { supabase } from "./supabase.js";
import { getToday, monthStart } from "./time.js";
import {
  fetchCategoryBudgets,
  fetchInvoiceById,
  fetchProjectById,
  fetchRevenueTargets,
} from "./queries.js";
import { logAudit } from "./audit.js";
import type { Database } from "../types/database.js";

export type ExpenseCategory = Database["public"]["Enums"]["expense_category"];

const VALID_CATEGORIES: readonly ExpenseCategory[] = ["payroll", "operations", "project_costs"];

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(value);
}

export async function updateProjectFlag(
  id: string,
  isFlagged: boolean,
  actorId: string,
): Promise<void> {
  const before = await fetchProjectById(id);
  const { error } = await supabase.from("projects").update({ is_flagged: isFlagged }).eq("id", id);
  if (error) throw error;
  await logAudit({
    userId: actorId,
    action: isFlagged ? "flag" : "unflag",
    entity: "project",
    entityId: id,
    before: before ? { is_flagged: before.is_flagged } : null,
    after: { is_flagged: isFlagged },
  });
}

export async function updateProjectBudget(
  id: string,
  budget: number,
  actorId: string,
): Promise<void> {
  const before = await fetchProjectById(id);
  const { error } = await supabase.from("projects").update({ budget }).eq("id", id);
  if (error) throw error;
  await logAudit({
    userId: actorId,
    action: "update",
    entity: "project",
    entityId: id,
    before: before ? { budget: before.budget } : null,
    after: { budget },
  });
}

/** Upserts this month's planned amount — category_budgets has no guaranteed row per period. */
export async function updateCategoryBudget(
  category: ExpenseCategory,
  plannedAmount: number,
  actorId: string,
): Promise<void> {
  const period = monthStart(getToday());
  const existing = await fetchCategoryBudgets(period);
  const before = existing.find((b) => b.category === category) ?? null;

  const { data, error } = await supabase
    .from("category_budgets")
    .upsert({ category, period, planned_amount: plannedAmount }, { onConflict: "category,period" })
    .select("id")
    .single();
  if (error) throw error;

  await logAudit({
    userId: actorId,
    action: "update",
    entity: "category_budget",
    entityId: data.id,
    before: before ? { planned_amount: before.planned_amount } : null,
    after: { planned_amount: plannedAmount },
  });
}

/** Upserts a month's revenue target — same "no guaranteed row per period" shape as category budgets. */
export async function updateRevenueTarget(
  period: string,
  targetAmount: number,
  actorId: string,
): Promise<void> {
  const existing = await fetchRevenueTargets();
  const before = existing.find((t) => t.period === period) ?? null;

  const { data, error } = await supabase
    .from("revenue_targets")
    .upsert({ period, target_amount: targetAmount }, { onConflict: "period" })
    .select("id")
    .single();
  if (error) throw error;

  await logAudit({
    userId: actorId,
    action: "update",
    entity: "revenue_target",
    entityId: data.id,
    before: before ? { target_amount: before.target_amount } : null,
    after: { target_amount: targetAmount },
  });
}

export interface CreateInvoiceInput {
  invoiceNumber: string;
  projectId: string;
  amount: number;
  issuedDate: string;
  dueDate: string;
}

export async function createInvoice(input: CreateInvoiceInput, actorId: string): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      invoice_number: input.invoiceNumber,
      project_id: input.projectId,
      amount: input.amount,
      issued_date: input.issuedDate,
      due_date: input.dueDate,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await logAudit({
    userId: actorId,
    action: "create",
    entity: "invoice",
    entityId: data.id,
    before: null,
    after: {
      invoiceNumber: input.invoiceNumber,
      projectId: input.projectId,
      amount: input.amount,
      issuedDate: input.issuedDate,
      dueDate: input.dueDate,
    },
  });
  return { id: data.id };
}

export interface UpdateInvoiceInput {
  amount: number;
  issuedDate: string;
  dueDate: string;
}

export async function updateInvoice(
  id: string,
  input: UpdateInvoiceInput,
  actorId: string,
): Promise<void> {
  const before = await fetchInvoiceById(id);
  const { error } = await supabase
    .from("invoices")
    .update({ amount: input.amount, issued_date: input.issuedDate, due_date: input.dueDate })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit({
    userId: actorId,
    action: "update",
    entity: "invoice",
    entityId: id,
    before: before
      ? { amount: before.amount, issuedDate: before.issued_date, dueDate: before.due_date }
      : null,
    after: { amount: input.amount, issuedDate: input.issuedDate, dueDate: input.dueDate },
  });
}

/** Caller must already have verified amount_paid === 0 — the DB constraint would reject it otherwise. */
export async function voidInvoice(id: string, actorId: string): Promise<void> {
  const before = await fetchInvoiceById(id);
  const voidedAt = getToday().toISOString().slice(0, 10);
  const { error } = await supabase.from("invoices").update({ voided_at: voidedAt }).eq("id", id);
  if (error) throw error;

  await logAudit({
    userId: actorId,
    action: "void",
    entity: "invoice",
    entityId: id,
    before: before ? { voidedAt: before.voided_at } : null,
    after: { voidedAt },
  });
}

export async function createPageNote(body: string, actorId: string): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("notes")
    .insert({ author_id: actorId, entity: "page", entity_id: null, body })
    .select("id")
    .single();
  if (error) throw error;

  await logAudit({
    userId: actorId,
    action: "create",
    entity: "page",
    entityId: data.id,
    before: null,
    after: { body },
  });
  return { id: data.id };
}
