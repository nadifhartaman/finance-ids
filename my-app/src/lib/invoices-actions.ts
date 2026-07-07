"use server";

/** Invoice create/edit/void (Phase 3 of .scratch/user-management/PRD.md) — invoices.write role. */
import { revalidatePath } from "next/cache";
import { authedFetch, patchAction } from "./authed-fetch";

export interface InvoiceFormState {
  error: string | null;
  success?: boolean;
}

export async function createInvoice(
  _prevState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const invoiceNumber = formData.get("invoiceNumber");
  const projectId = formData.get("projectId");
  const amount = Number(formData.get("amount"));
  const issuedDate = formData.get("issuedDate");
  const dueDate = formData.get("dueDate");

  if (
    typeof invoiceNumber !== "string" ||
    !invoiceNumber.trim() ||
    typeof projectId !== "string" ||
    !projectId ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    typeof issuedDate !== "string" ||
    typeof dueDate !== "string"
  ) {
    return { error: "All fields are required, and amount must be positive." };
  }

  const res = await authedFetch("/api/invoices", {
    method: "POST",
    body: JSON.stringify({ invoiceNumber: invoiceNumber.trim(), projectId, amount, issuedDate, dueDate }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.error ?? "Failed to create invoice." };
  }

  revalidatePath("/invoices");
  revalidatePath("/");
  return { error: null, success: true };
}

export async function updateInvoice(
  id: string,
  input: { amount: number; issuedDate: string; dueDate: string },
): Promise<{ error: string | null }> {
  return patchAction(`/api/invoices/${id}`, input, ["/invoices", "/"], "Failed to update invoice.");
}

export async function voidInvoice(id: string): Promise<{ error: string | null }> {
  return patchAction(
    `/api/invoices/${id}/void`,
    undefined,
    ["/invoices", "/"],
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
    ["/invoices", "/"],
    "Failed to record payment.",
  );
}
