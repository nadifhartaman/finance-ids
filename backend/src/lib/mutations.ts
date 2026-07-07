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
export type ProductLine = Database["public"]["Enums"]["product_line"];
export type ClientType = Database["public"]["Enums"]["client_type"];

const VALID_CATEGORIES: readonly ExpenseCategory[] = ["payroll", "operations", "project_costs"];

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(value);
}

export const VALID_PRODUCT_LINES: readonly ProductLine[] = [
  "VIANA",
  "ORION",
  "AIoT",
  "Indi AI",
  "3D Digital Twin",
];

export function isProductLine(value: string): value is ProductLine {
  return (VALID_PRODUCT_LINES as readonly string[]).includes(value);
}

const VALID_CLIENT_TYPES: readonly ClientType[] = ["government", "private"];

export function isClientType(value: string): value is ClientType {
  return (VALID_CLIENT_TYPES as readonly string[]).includes(value);
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

export async function createClient(name: string, clientType: ClientType): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("clients")
    .insert({ name, client_type: clientType })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export interface CreateProjectInput {
  clientId?: string;
  newClient?: { name: string; clientType: ClientType };
  name: string;
  productLine: ProductLine;
  contractValue: number;
  budget: number | null;
}

export async function createProject(
  input: CreateProjectInput,
  actorId: string,
): Promise<{ id: string }> {
  let clientId = input.clientId;
  if (input.newClient) {
    const client = await createClient(input.newClient.name, input.newClient.clientType);
    clientId = client.id;
  }
  if (!clientId) throw new Error("clientId or newClient is required");

  const { data, error } = await supabase
    .from("projects")
    .insert({
      client_id: clientId,
      name: input.name,
      product_line: input.productLine,
      contract_value: input.contractValue,
      budget: input.budget,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await logAudit({
    userId: actorId,
    action: "create",
    entity: "project",
    entityId: data.id,
    before: null,
    after: {
      clientId,
      newClient: input.newClient ?? null,
      name: input.name,
      productLine: input.productLine,
      contractValue: input.contractValue,
      budget: input.budget,
    },
  });
  return { id: data.id };
}

export interface UpdateProjectInput {
  name: string;
  productLine: ProductLine;
  contractValue: number;
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
  actorId: string,
): Promise<void> {
  const before = await fetchProjectById(id);
  const { error } = await supabase
    .from("projects")
    .update({
      name: input.name,
      product_line: input.productLine,
      contract_value: input.contractValue,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit({
    userId: actorId,
    action: "update",
    entity: "project",
    entityId: id,
    before: before
      ? { name: before.name, productLine: before.product_line, contractValue: before.contract_value }
      : null,
    after: { name: input.name, productLine: input.productLine, contractValue: input.contractValue },
  });
}

/** Caller must already have verified via projectHasFinancialHistory — the DB's ON DELETE RESTRICT is the backstop. */
export async function deleteProject(id: string, actorId: string): Promise<void> {
  const before = await fetchProjectById(id);
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit({
    userId: actorId,
    action: "delete",
    entity: "project",
    entityId: id,
    before: before ? { name: before.name, contractValue: before.contract_value } : null,
    after: null,
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
