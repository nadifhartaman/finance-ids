/**
 * Report-data writes (Phase 3 of .scratch/user-management/PRD.md) — kept
 * separate from queries.ts, which is documented as read-only reporting data
 * for the 5 dashboard pages.
 */
import { supabase } from "./supabase.js";
import { getToday, monthStart } from "./time.js";
import type { Database } from "../types/database.js";

export type ExpenseCategory = Database["public"]["Enums"]["expense_category"];

const VALID_CATEGORIES: readonly ExpenseCategory[] = ["payroll", "operations", "project_costs"];

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(value);
}

export async function updateProjectFlag(id: string, isFlagged: boolean): Promise<void> {
  const { error } = await supabase.from("projects").update({ is_flagged: isFlagged }).eq("id", id);
  if (error) throw error;
}

export async function updateProjectBudget(id: string, budget: number): Promise<void> {
  const { error } = await supabase.from("projects").update({ budget }).eq("id", id);
  if (error) throw error;
}

/** Upserts this month's planned amount — category_budgets has no guaranteed row per period. */
export async function updateCategoryBudget(
  category: ExpenseCategory,
  plannedAmount: number,
): Promise<void> {
  const period = monthStart(getToday());
  const { error } = await supabase
    .from("category_budgets")
    .upsert({ category, period, planned_amount: plannedAmount }, { onConflict: "category,period" });
  if (error) throw error;
}
