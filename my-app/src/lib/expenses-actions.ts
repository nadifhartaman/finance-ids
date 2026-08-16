"use server";

/** Expense document writes (spending.write role) — Draft ▸ Posted lifecycle, backed by /api/expenses. */
import { revalidatePath } from "next/cache";
import { authedFetch, patchAction } from "./authed-fetch";
import { APP_ROUTES, expenseRoute } from "./routes";
import type { ExpenseCategory } from "./types";

export interface ExpenseDocInput {
  category: ExpenseCategory;
  projectId: string | null;
  description: string;
  amount: number;
  spentOn: string;
  /** null => cash expense, paid from paidFromAccountId. Set => vendor bill, requires partnerId. */
  dueDate: string | null;
  partnerId: string | null;
  paidFromAccountId: string | null;
}

/** Creates a draft — nothing posts to the ledger until postExpense is called. */
export async function createExpenseDraft(
  input: ExpenseDocInput,
): Promise<{ id: string | null; error: string | null }> {
  const res = await authedFetch("/api/expenses", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { id: null, error: body?.error ?? "Failed to create expense." };
  }
  const { id } = await res.json();
  revalidatePath(APP_ROUTES.expenses);
  revalidatePath(APP_ROUTES.payables);
  revalidatePath("/");
  return { id, error: null };
}

/** Edits a draft in place — the backend rejects this once the expense is posted. */
export async function updateExpenseDraft(
  id: string,
  input: Partial<ExpenseDocInput>,
): Promise<{ error: string | null }> {
  return patchAction(
    `/api/expenses/${id}`,
    input,
    [expenseRoute(id), APP_ROUTES.expenses],
    "Failed to update expense.",
    "PATCH",
  );
}

/** Posts a draft: assigns its document number and writes the ledger entry. */
export async function postExpenseDoc(id: string): Promise<{ error: string | null }> {
  const res = await authedFetch(`/api/expenses/${id}/post`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.error ?? "Failed to post expense." };
  }
  revalidatePath(expenseRoute(id));
  revalidatePath(APP_ROUTES.expenses);
  revalidatePath(APP_ROUTES.payables);
  revalidatePath("/");
  return { error: null };
}

/** Cancels a draft in place — no ledger entry was ever created. */
export async function cancelExpenseDraft(id: string): Promise<{ error: string | null }> {
  const res = await authedFetch(`/api/expenses/${id}/cancel`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.error ?? "Failed to cancel expense." };
  }
  revalidatePath(expenseRoute(id));
  revalidatePath(APP_ROUTES.expenses);
  return { error: null };
}

/** Corrects a *posted* expense via a reversal entry — the draft-cancel path above is for drafts. */
export async function voidExpenseDoc(id: string): Promise<{ error: string | null }> {
  return patchAction(
    `/api/expenses/${id}/void`,
    undefined,
    [expenseRoute(id), APP_ROUTES.expenses, APP_ROUTES.payables, "/"],
    "Failed to void expense.",
  );
}
