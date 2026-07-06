/**
 * Report-data writes (Phase 3 of .scratch/user-management/PRD.md) — kept
 * separate from queries.ts, which is documented as read-only reporting data
 * for the 5 dashboard pages.
 */
import { supabase } from "./supabase.js";
import { getToday, monthStart } from "./time.js";
import { fetchCategoryBudgets, fetchProjectById } from "./queries.js";
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
