"use server";

/** Expense create (spending.write role) — logs Money Out against a category. */
import { revalidatePath } from "next/cache";
import { authedFetch } from "./authed-fetch";

export interface ExpenseFormState {
  error: string | null;
  success?: boolean;
}

export async function createExpense(
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const category = formData.get("category");
  const projectId = formData.get("projectId");
  const description = formData.get("description");
  const amount = Number(formData.get("amount"));
  const spentOn = formData.get("spentOn");

  if (
    typeof category !== "string" ||
    !category ||
    typeof description !== "string" ||
    !description.trim() ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    typeof spentOn !== "string" ||
    !spentOn
  ) {
    return { error: "All fields are required, and amount must be positive." };
  }

  const isProjectCost = category === "project_costs";
  if (isProjectCost && (typeof projectId !== "string" || !projectId)) {
    return { error: "A project is required for project costs." };
  }

  const res = await authedFetch("/api/budgets/expenses", {
    method: "POST",
    body: JSON.stringify({
      category,
      projectId: isProjectCost ? projectId : null,
      description: description.trim(),
      amount,
      spentOn,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.error ?? "Failed to create expense." };
  }

  revalidatePath("/budgets");
  revalidatePath("/");
  return { error: null, success: true };
}
