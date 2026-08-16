"use server";

/** Invoice document writes (invoices.write role) — Draft ▸ Posted lifecycle, backed by /api/invoices. */
import { revalidatePath } from "next/cache";
import { authedFetch, patchAction } from "./authed-fetch";
import { APP_ROUTES, invoiceRoute } from "./routes";

export interface InvoiceDocInput {
  invoiceNumber: string;
  projectId: string;
  amount: number;
  issuedDate: string;
  dueDate: string;
}

/** Creates a draft — nothing posts to the ledger until postInvoiceDoc is called. */
export async function createInvoiceDraft(
  input: InvoiceDocInput,
): Promise<{ id: string | null; error: string | null }> {
  const res = await authedFetch("/api/invoices", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { id: null, error: body?.error ?? "Failed to create invoice." };
  }
  const { id } = await res.json();
  revalidatePath(APP_ROUTES.receivables);
  revalidatePath("/");
  return { id, error: null };
}

/** Edits a draft in place — the backend rejects this once the invoice is posted. */
export async function updateInvoiceDraft(
  id: string,
  input: Partial<InvoiceDocInput>,
): Promise<{ error: string | null }> {
  return patchAction(
    `/api/invoices/${id}`,
    input,
    [invoiceRoute(id), APP_ROUTES.receivables],
    "Failed to update invoice.",
    "PATCH",
  );
}

/** Posts a draft: generates the ledger entry (Dr A/R, Cr Revenue). */
export async function postInvoiceDoc(id: string): Promise<{ error: string | null }> {
  const res = await authedFetch(`/api/invoices/${id}/post`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.error ?? "Failed to post invoice." };
  }
  revalidatePath(invoiceRoute(id));
  revalidatePath(APP_ROUTES.receivables);
  revalidatePath("/");
  return { error: null };
}

/** Cancels a draft in place — no ledger entry was ever created. */
export async function cancelInvoiceDraft(id: string): Promise<{ error: string | null }> {
  const res = await authedFetch(`/api/invoices/${id}/cancel`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.error ?? "Failed to cancel invoice." };
  }
  revalidatePath(invoiceRoute(id));
  revalidatePath(APP_ROUTES.receivables);
  return { error: null };
}

/** Corrects a *posted* invoice via a reversal entry — the draft-cancel path above is for drafts. UI copy stays "Cancel invoice". */
export async function voidInvoice(id: string): Promise<{ error: string | null }> {
  return patchAction(
    `/api/invoices/${id}/void`,
    undefined,
    [invoiceRoute(id), APP_ROUTES.receivables, "/"],
    "Failed to cancel invoice.",
  );
}

export async function recordPayment(
  id: string,
  input: { amountReceived: number; receivedDate: string },
): Promise<{ error: string | null }> {
  return patchAction(
    `/api/invoices/${id}/payment`,
    input,
    [invoiceRoute(id), APP_ROUTES.receivables, "/"],
    "Failed to record payment.",
  );
}
