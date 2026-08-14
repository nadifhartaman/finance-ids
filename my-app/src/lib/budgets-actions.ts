"use server";

/** Budget edits (Phase 3 of .scratch/user-management/PRD.md) — budgets.edit role. */
import { patchAction } from "./authed-fetch";

export async function updateCategoryBudget(
  category: string,
  plannedAmount: number,
): Promise<{ error: string | null }> {
  return patchAction(
    `/api/budgets/categories/${category}`,
    { plannedAmount },
    ["/money-out", "/"],
    "Failed to update budget.",
  );
}

export async function updateProjectBudgetAmount(
  id: string,
  budget: number,
): Promise<{ error: string | null }> {
  return patchAction(`/api/projects/${id}/budget`, { budget }, ["/money-out", "/"], "Failed to update budget.");
}
