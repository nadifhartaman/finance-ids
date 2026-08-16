"use server";

/** Loan writes (accounting.post role) — no draft/post lifecycle, posts to the ledger immediately. */
import { revalidatePath } from "next/cache";
import { authedFetch } from "./authed-fetch";
import { APP_ROUTES } from "./routes";
import type { LoanInput, RepaymentInput } from "./types";

/** Creates a loan and immediately posts the disbursement entry. */
export async function createLoan(
  input: LoanInput,
): Promise<{ id: string | null; error: string | null }> {
  const res = await authedFetch("/api/accounting/loans", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { id: null, error: body?.error ?? "Failed to create loan." };
  }
  const { id } = await res.json();
  revalidatePath(APP_ROUTES.loans);
  revalidatePath("/");
  return { id, error: null };
}

/** Records a principal and/or interest repayment against an existing loan. */
export async function recordLoanRepayment(
  loanId: string,
  input: RepaymentInput,
): Promise<{ error: string | null }> {
  const res = await authedFetch(`/api/accounting/loans/${loanId}/repayment`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.error ?? "Failed to record repayment." };
  }
  revalidatePath(APP_ROUTES.loans);
  revalidatePath("/");
  return { error: null };
}
