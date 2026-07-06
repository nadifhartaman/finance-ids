"use server";

/** Budget edits (Phase 3 of .scratch/user-management/PRD.md) — budgets.edit role. */
import { revalidatePath } from "next/cache";
import { authedFetch } from "./authed-fetch";

export async function updateCategoryBudget(
  category: string,
  plannedAmount: number,
): Promise<{ error: string | null }> {
  const res = await authedFetch(`/api/budgets/categories/${category}`, {
    method: "PATCH",
    body: JSON.stringify({ plannedAmount }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.error ?? "Failed to update budget." };
  }
  revalidatePath("/budgets");
  revalidatePath("/");
  return { error: null };
}

export async function updateProjectBudgetAmount(
  id: string,
  budget: number,
): Promise<{ error: string | null }> {
  const res = await authedFetch(`/api/projects/${id}/budget`, {
    method: "PATCH",
    body: JSON.stringify({ budget }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.error ?? "Failed to update budget." };
  }
  revalidatePath("/budgets");
  revalidatePath("/");
  return { error: null };
}
