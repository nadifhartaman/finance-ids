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
import { formatRupiah } from "./format.js";
import type { Database } from "../types/database.js";
import { resolveAccount, resolveJournal } from "./accounting/coa.js";
import {
  postInvoiceEntry,
  postInvoicePaymentEntry,
  postExpenseEntry,
  postVendorBillEntry,
  postVendorPaymentEntry,
  postLoanDisbursementEntry,
  postLoanRepaymentEntry,
  postLoanInterestEntry,
  postReversalEntry,
} from "./accounting/posting.js";
import { fetchExpenseById, fetchExpenseOutstanding, fetchLoanOutstanding } from "./queries.js";

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

/** Inserts a **draft** invoice — no ledger posting, no effect on revenue/AR reports (see postInvoice). */
export async function createInvoice(input: CreateInvoiceInput, actorId: string): Promise<{ id: string }> {
  const project = await fetchProjectById(input.projectId);
  if (!project) throw new Error("Project not found");

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      invoice_number: input.invoiceNumber,
      project_id: input.projectId,
      partner_id: project.partner_id,
      amount: input.amount,
      issued_date: input.issuedDate,
      due_date: input.dueDate,
      status: "draft",
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
      status: "draft",
    },
  });
  return { id: data.id };
}

/** Posts a draft invoice to the ledger (Dr A/R, Cr Revenue) — the moment it starts affecting reports. */
export async function postInvoice(id: string, actorId: string): Promise<{ id: string }> {
  const before = await fetchInvoiceById(id);
  if (!before) throw new Error("Invoice not found");
  if (before.status !== "draft") throw new Error("Only a draft invoice can be posted");

  await postInvoiceEntry({
    invoiceId: id,
    invoiceNumber: before.invoice_number,
    partnerId: before.partner_id,
    projectId: before.project_id,
    amount: before.amount,
    issuedDate: before.issued_date,
    actorId,
  });

  const postedAt = getToday().toISOString();
  const { error } = await supabase
    .from("invoices")
    .update({ status: "posted", posted_at: postedAt, posted_by: actorId })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit({
    userId: actorId,
    action: "post",
    entity: "invoice",
    entityId: id,
    before: { status: "draft" },
    after: { status: "posted" },
  });
  return { id };
}

/** Cancels a draft in place — no ledger entry was ever created, so there's nothing to reverse. Mirrors cancelDraftExpense: cancel is for drafts, void is for posted documents. */
export async function cancelDraftInvoice(id: string, actorId: string): Promise<void> {
  const before = await fetchInvoiceById(id);
  if (!before) throw new Error("Invoice not found");
  if (before.status !== "draft") throw new Error("Only a draft invoice can be cancelled");

  const { error } = await supabase.from("invoices").update({ status: "cancelled" }).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit({
    userId: actorId,
    action: "cancel",
    entity: "invoice",
    entityId: id,
    before: { status: "draft" },
    after: { status: "cancelled" },
  });
}

export interface CreateExpenseInput {
  category: ExpenseCategory;
  projectId: string | null;
  description: string;
  amount: number;
  spentOn: string;
  /** Vendor — required iff dueDate is set (a vendor bill), ignored (must be null) for a cash expense. */
  partnerId?: string | null;
  /** null => cash expense, paid from paidFromAccountId at post time. Set => vendor bill, settled later via recordExpensePayment. */
  dueDate?: string | null;
  /** Which bank/cash account this will be paid from — required for a cash expense (ignored for a vendor bill, which credits A/P instead). Only needed at post time, but accepted at create time so the draft can show it. */
  paidFromAccountId?: string | null;
}

/**
 * Inserts a **draft** expense document — no ledger posting, no document
 * number. Nothing shows up in any report or budget total until postExpense
 * flips it to posted; see help-me-plan-for-foamy-bird.md Phase D. This is
 * the split-off half of what used to be create-and-post-in-one-shot.
 */
export async function createExpense(input: CreateExpenseInput, actorId: string): Promise<{ id: string }> {
  const isVendorBill = !!input.dueDate;
  if (isVendorBill && !input.partnerId) {
    throw new Error("partnerId is required for a vendor bill (dueDate set)");
  }
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      category: input.category,
      project_id: input.projectId,
      description: input.description,
      amount: input.amount,
      spent_on: input.spentOn,
      partner_id: isVendorBill ? (input.partnerId ?? null) : null,
      due_date: input.dueDate ?? null,
      paid_from_account_id: isVendorBill ? null : (input.paidFromAccountId ?? null),
      status: "draft",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await logAudit({
    userId: actorId,
    action: "create",
    entity: "expense",
    entityId: data.id,
    before: null,
    after: {
      category: input.category,
      projectId: input.projectId,
      description: input.description,
      amount: input.amount,
      spentOn: input.spentOn,
      partnerId: isVendorBill ? (input.partnerId ?? null) : null,
      dueDate: input.dueDate ?? null,
      status: "draft",
    },
  });
  return { id: data.id };
}

export interface UpdateExpenseInput {
  category?: ExpenseCategory;
  projectId?: string | null;
  description?: string;
  amount?: number;
  spentOn?: string;
  partnerId?: string | null;
  dueDate?: string | null;
  paidFromAccountId?: string | null;
}

/** Edits a draft expense in place — the same "only a draft can change" rule updateDraftEntry already enforces for manual journal entries. */
export async function updateExpense(id: string, patch: UpdateExpenseInput, actorId: string): Promise<void> {
  const before = await fetchExpenseById(id);
  if (!before) throw new Error("Expense not found");
  if (before.status !== "draft") throw new Error("Only a draft expense can be edited");

  const isVendorBill = patch.dueDate !== undefined ? !!patch.dueDate : !!before.due_date;
  const headerPatch: Database["public"]["Tables"]["expenses"]["Update"] = {};
  if (patch.category !== undefined) headerPatch.category = patch.category;
  if (patch.projectId !== undefined) headerPatch.project_id = patch.projectId;
  if (patch.description !== undefined) headerPatch.description = patch.description;
  if (patch.amount !== undefined) headerPatch.amount = patch.amount;
  if (patch.spentOn !== undefined) headerPatch.spent_on = patch.spentOn;
  if (patch.dueDate !== undefined) headerPatch.due_date = patch.dueDate;
  if (patch.partnerId !== undefined || patch.dueDate !== undefined) {
    headerPatch.partner_id = isVendorBill ? (patch.partnerId ?? before.partner_id) : null;
  }
  if (patch.paidFromAccountId !== undefined) {
    headerPatch.paid_from_account_id = isVendorBill ? null : patch.paidFromAccountId;
  }

  const { error } = await supabase.from("expenses").update(headerPatch).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit({
    userId: actorId,
    action: "update",
    entity: "expense",
    entityId: id,
    before: { ...before },
    after: { ...before, ...patch },
  });
}

/** Posts a draft expense: assigns its document number and generates the ledger entry — the moment it starts affecting reports and budget totals. */
export async function postExpense(id: string, actorId: string): Promise<{ id: string; documentNumber: string }> {
  const before = await fetchExpenseById(id);
  if (!before) throw new Error("Expense not found");
  if (before.status !== "draft") throw new Error("Only a draft expense can be posted");

  const isVendorBill = !!before.due_date;
  if (isVendorBill && !before.partner_id) {
    throw new Error("This vendor bill has no vendor on record");
  }
  if (!isVendorBill && !before.paid_from_account_id) {
    throw new Error("Choose which account this was paid from before posting");
  }

  const spentOnYear = new Date(before.spent_on).getUTCFullYear();
  const { data: numberResult, error: numberError } = await supabase.rpc("next_expense_number", {
    p_year: spentOnYear,
  });
  if (numberError) throw new Error(numberError.message);
  const documentNumber = numberResult as unknown as string;

  if (isVendorBill) {
    await postVendorBillEntry({
      expenseId: id,
      category: before.category,
      projectId: before.project_id,
      partnerId: before.partner_id!,
      description: before.description,
      amount: before.amount,
      spentOn: before.spent_on,
      actorId,
    });
  } else {
    await postExpenseEntry({
      expenseId: id,
      category: before.category,
      projectId: before.project_id,
      partnerId: null,
      description: before.description,
      amount: before.amount,
      spentOn: before.spent_on,
      actorId,
      paidFromAccountId: before.paid_from_account_id,
    });
  }

  const { error } = await supabase
    .from("expenses")
    .update({
      status: "posted",
      document_number: documentNumber,
      posted_at: getToday().toISOString().slice(0, 10),
      posted_by: actorId,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit({
    userId: actorId,
    action: "post",
    entity: "expense",
    entityId: id,
    before: { status: "draft" },
    after: { status: "posted", documentNumber },
  });

  return { id, documentNumber };
}

/** Cancels a draft in place — no ledger entry was ever created, so there's nothing to reverse. Mirrors cancelDraftEntry's role for manual journal entries: cancel is for drafts, void is for posted documents. */
export async function cancelDraftExpense(id: string, actorId: string): Promise<void> {
  const before = await fetchExpenseById(id);
  if (!before) throw new Error("Expense not found");
  if (before.status !== "draft") throw new Error("Only a draft expense can be cancelled");

  const { error } = await supabase.from("expenses").update({ status: "cancelled" }).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit({
    userId: actorId,
    action: "cancel",
    entity: "expense",
    entityId: id,
    before: { status: "draft" },
    after: { status: "cancelled" },
  });
}

/** Caller must already have verified this expense has no payment allocations — the same guard voidInvoice applies to amount_paid. Corrects a *posted* expense; a draft is cancelled instead (cancelDraftExpense). */
export async function voidExpense(id: string, actorId: string): Promise<void> {
  const before = await fetchExpenseById(id);
  if (!before) throw new Error("Expense not found");
  if (before.status !== "posted") throw new Error("Only a posted expense can be voided");
  if (before.voided_at) throw new Error("This expense is already voided");
  const outstanding = await fetchExpenseOutstanding(id);
  if (before.due_date && outstanding < before.amount) {
    throw new Error("This vendor bill has payments recorded against it — it can't be voided");
  }

  const voidedAt = getToday().toISOString().slice(0, 10);
  const { error } = await supabase.from("expenses").update({ voided_at: voidedAt }).eq("id", id);
  if (error) throw new Error(error.message);

  const { data: entry, error: entryError } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("source_type", "expense")
    .eq("source_id", id)
    .eq("status", "posted")
    .maybeSingle();
  if (entryError) throw new Error(entryError.message);
  if (entry) {
    await postReversalEntry(entry.id, voidedAt, actorId);
  }

  await logAudit({
    userId: actorId,
    action: "void",
    entity: "expense",
    entityId: id,
    before: { voidedAt: before.voided_at },
    after: { voidedAt },
  });
}

/**
 * Records a payment against a vendor bill (an expense with due_date set —
 * cash expenses were already settled at creation and never take payments).
 * Mirrors recordInvoicePayment but outbound: Dr Accounts Payable / Cr Bank.
 */
export async function recordExpensePayment(
  expenseId: string,
  amountPaid: number,
  paymentDate: string,
  actorId: string,
): Promise<void> {
  const before = await fetchExpenseById(expenseId);
  if (!before) throw new Error("Expense not found");
  if (!before.due_date) throw new Error("This is a cash expense, not a vendor bill — it has nothing outstanding");
  if (before.voided_at) throw new Error("This vendor bill was voided — it can't receive payments");
  if (!before.partner_id) throw new Error("This vendor bill has no vendor on record");
  const partnerId = before.partner_id;

  const outstanding = await fetchExpenseOutstanding(expenseId);
  if (amountPaid > outstanding) {
    throw new Error(`That's more than what's left on this bill — ${formatRupiah(outstanding)} outstanding`);
  }
  if (amountPaid <= 0) throw new Error("amountPaid must be positive");

  const [bankAccountId, journalId] = await Promise.all([
    resolveAccount("default_bank"),
    resolveJournal("BNK1"),
  ]);
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      payment_number: `PMT-${before.description.slice(0, 20)}-${Date.now()}`,
      direction: "outbound",
      partner_id: partnerId,
      bank_account_id: bankAccountId,
      journal_id: journalId,
      payment_date: paymentDate,
      amount: amountPaid,
      created_by: actorId,
    })
    .select("id")
    .single();
  if (paymentError) throw new Error(paymentError.message);

  const { error: allocationError } = await supabase
    .from("payment_allocations")
    .insert({ payment_id: payment.id, expense_id: expenseId, amount: amountPaid });
  if (allocationError) throw new Error(allocationError.message);

  await postVendorPaymentEntry({
    paymentId: payment.id,
    partnerId,
    description: before.description,
    amount: amountPaid,
    paymentDate,
    actorId,
  });

  await logAudit({
    userId: actorId,
    action: "payment",
    entity: "expense",
    entityId: expenseId,
    before: { outstanding },
    after: { outstanding: outstanding - amountPaid, amountPaid },
  });
}

export interface UpdateInvoiceInput {
  invoiceNumber?: string;
  projectId?: string;
  amount: number;
  issuedDate: string;
  dueDate: string;
}

/** Edits a draft invoice in place — mirrors updateExpense's "only a draft can change" rule. */
export async function updateInvoice(
  id: string,
  input: UpdateInvoiceInput,
  actorId: string,
): Promise<void> {
  const before = await fetchInvoiceById(id);
  if (!before) throw new Error("Invoice not found");
  if (before.status !== "draft") throw new Error("Only a draft invoice can be edited");

  const patch: Database["public"]["Tables"]["invoices"]["Update"] = {
    amount: input.amount,
    issued_date: input.issuedDate,
    due_date: input.dueDate,
  };
  if (input.invoiceNumber !== undefined) patch.invoice_number = input.invoiceNumber;
  if (input.projectId !== undefined && input.projectId !== before.project_id) {
    const project = await fetchProjectById(input.projectId);
    if (!project) throw new Error("Project not found");
    patch.project_id = input.projectId;
    patch.partner_id = project.partner_id;
  }

  const { error } = await supabase.from("invoices").update(patch).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit({
    userId: actorId,
    action: "update",
    entity: "invoice",
    entityId: id,
    before: {
      invoiceNumber: before.invoice_number,
      projectId: before.project_id,
      amount: before.amount,
      issuedDate: before.issued_date,
      dueDate: before.due_date,
    },
    after: {
      invoiceNumber: input.invoiceNumber ?? before.invoice_number,
      projectId: input.projectId ?? before.project_id,
      amount: input.amount,
      issuedDate: input.issuedDate,
      dueDate: input.dueDate,
    },
  });
}

/** Reverses a *posted* invoice via a reversal journal entry; a draft is cancelled instead (cancelDraftInvoice). Self-contained guards, mirroring voidExpense. */
export async function voidInvoice(id: string, actorId: string): Promise<void> {
  const before = await fetchInvoiceById(id);
  if (!before) throw new Error("Invoice not found");
  if (before.status !== "posted") throw new Error("Only a posted invoice can be voided");
  if (before.voided_at) throw new Error("This invoice is already cancelled");
  if (before.amount_paid > 0) throw new Error("Cannot cancel an invoice that has payments recorded");

  const voidedAt = getToday().toISOString().slice(0, 10);
  const { error } = await supabase.from("invoices").update({ voided_at: voidedAt }).eq("id", id);
  if (error) throw error;

  // Reverse the invoice's A/R and revenue — a voided invoice contributed
  // nothing to cash (guarded by amount_paid === 0 above), so the ledger
  // shouldn't keep carrying it either.
  const { data: entry, error: entryError } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("source_type", "invoice")
    .eq("source_id", id)
    .eq("status", "posted")
    .maybeSingle();
  if (entryError) throw new Error(entryError.message);
  if (entry) {
    await postReversalEntry(entry.id, voidedAt, actorId);
  }

  await logAudit({
    userId: actorId,
    action: "void",
    entity: "invoice",
    entityId: id,
    before: before ? { voidedAt: before.voided_at } : null,
    after: { voidedAt },
  });
}

/**
 * Records money that actually arrived — status is never set directly (see
 * docs/erd.md "Derived, never stored"); it's recomputed from amount_paid /
 * paid_date every time invoiceStatus() runs. Partial payments are expected
 * (government clients commonly short-pay); paid_date is only set once
 * amount_paid reaches the full amount, matching the DB CHECK.
 */
export async function recordInvoicePayment(
  id: string,
  amountReceived: number,
  receivedDate: string,
  actorId: string,
): Promise<void> {
  const before = await fetchInvoiceById(id);
  if (!before) throw new Error("Invoice not found");
  if (before.status !== "posted") throw new Error("This invoice hasn't been posted yet");
  if (before.voided_at) throw new Error("This invoice was cancelled — it can't receive payments");
  if (before.amount_paid >= before.amount) throw new Error("This invoice is already fully paid");

  const newAmountPaid = before.amount_paid + amountReceived;
  if (newAmountPaid > before.amount) {
    const remaining = before.amount - before.amount_paid;
    throw new Error(
      `That's more than what's left on this invoice — ${formatRupiah(remaining)} outstanding`,
    );
  }

  const isFullySettled = newAmountPaid === before.amount;
  const paidDate = isFullySettled ? receivedDate : null;

  const { error } = await supabase
    .from("invoices")
    .update({ amount_paid: newAmountPaid, paid_date: paidDate })
    .eq("id", id);
  if (error) throw new Error(error.message);

  const [bankAccountId, journalId] = await Promise.all([
    resolveAccount("default_bank"),
    resolveJournal("BNK1"),
  ]);
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      payment_number: `PMT-${before.invoice_number}-${Date.now()}`,
      direction: "inbound",
      partner_id: before.partner_id,
      bank_account_id: bankAccountId,
      journal_id: journalId,
      payment_date: receivedDate,
      amount: amountReceived,
      created_by: actorId,
    })
    .select("id")
    .single();
  if (paymentError) throw new Error(paymentError.message);

  const { error: allocationError } = await supabase
    .from("payment_allocations")
    .insert({ payment_id: payment.id, invoice_id: id, amount: amountReceived });
  if (allocationError) throw new Error(allocationError.message);

  await postInvoicePaymentEntry({
    paymentId: payment.id,
    invoiceNumber: before.invoice_number,
    partnerId: before.partner_id,
    amount: amountReceived,
    paymentDate: receivedDate,
    actorId,
  });

  await logAudit({
    userId: actorId,
    action: "payment",
    entity: "invoice",
    entityId: id,
    before: { amountPaid: before.amount_paid, paidDate: before.paid_date },
    after: { amountPaid: newAmountPaid, paidDate, amountReceived },
  });
}

export interface CreateLoanInput {
  reference: string;
  lenderPartnerId: string;
  liabilityAccountId: string;
  principalAmount: number;
  interestRatePct?: number | null;
  startDate: string;
  maturityDate?: string | null;
}

/** Creates the loan and immediately disburses the full principal: Dr Bank / Cr the loan's liability account. */
export async function createLoan(input: CreateLoanInput, actorId: string): Promise<{ id: string }> {
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, subtype")
    .eq("id", input.liabilityAccountId)
    .maybeSingle();
  if (accountError) throw new Error(accountError.message);
  if (!account || account.subtype !== "loan") {
    throw new Error("liabilityAccountId must reference an account with subtype 'loan'");
  }

  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .insert({
      reference: input.reference,
      lender_partner_id: input.lenderPartnerId,
      liability_account_id: input.liabilityAccountId,
      principal_amount: input.principalAmount,
      interest_rate_pct: input.interestRatePct ?? null,
      start_date: input.startDate,
      maturity_date: input.maturityDate ?? null,
    })
    .select("id")
    .single();
  if (loanError) throw new Error(loanError.message);

  const { data: txn, error: txnError } = await supabase
    .from("loan_transactions")
    .insert({
      loan_id: loan.id,
      type: "disbursement",
      txn_date: input.startDate,
      amount: input.principalAmount,
      created_by: actorId,
    })
    .select("id")
    .single();
  if (txnError) throw new Error(txnError.message);

  await postLoanDisbursementEntry({
    loanTransactionId: txn.id,
    reference: input.reference,
    lenderPartnerId: input.lenderPartnerId,
    liabilityAccountId: input.liabilityAccountId,
    amount: input.principalAmount,
    txnDate: input.startDate,
    actorId,
  });

  await logAudit({
    userId: actorId,
    action: "create",
    entity: "loan",
    entityId: loan.id,
    before: null,
    after: { reference: input.reference, principalAmount: input.principalAmount, startDate: input.startDate },
  });
  return { id: loan.id };
}

/**
 * Records a repayment: principal reduces the liability, interest hits P&L.
 * At least one of principalAmount/interestAmount must be positive. Each
 * non-zero component posts its own balanced journal entry (both against
 * Bank) — a loan repayment isn't a single indivisible document the way an
 * invoice/expense is, so two entries here is not a modeling shortcut.
 */
export async function recordLoanRepayment(
  loanId: string,
  principalAmount: number,
  interestAmount: number,
  paymentDate: string,
  actorId: string,
): Promise<void> {
  if (principalAmount < 0 || interestAmount < 0) throw new Error("Amounts must be non-negative");
  if (principalAmount === 0 && interestAmount === 0) {
    throw new Error("At least one of principalAmount/interestAmount must be positive");
  }

  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .select("id, reference, lender_partner_id, liability_account_id, status")
    .eq("id", loanId)
    .maybeSingle();
  if (loanError) throw new Error(loanError.message);
  if (!loan) throw new Error("Loan not found");
  if (loan.status === "cancelled") throw new Error("This loan was cancelled");

  if (principalAmount > 0) {
    const outstanding = await fetchLoanOutstanding(loanId);
    if (principalAmount > outstanding) {
      throw new Error(`That's more than the outstanding principal — ${formatRupiah(outstanding)} left`);
    }
  }

  if (principalAmount > 0) {
    const { data: txn, error: txnError } = await supabase
      .from("loan_transactions")
      .insert({
        loan_id: loanId,
        type: "principal_repayment",
        txn_date: paymentDate,
        amount: principalAmount,
        created_by: actorId,
      })
      .select("id")
      .single();
    if (txnError) throw new Error(txnError.message);

    await postLoanRepaymentEntry({
      loanTransactionId: txn.id,
      reference: loan.reference,
      lenderPartnerId: loan.lender_partner_id,
      liabilityAccountId: loan.liability_account_id,
      amount: principalAmount,
      txnDate: paymentDate,
      actorId,
    });
  }

  if (interestAmount > 0) {
    const { data: txn, error: txnError } = await supabase
      .from("loan_transactions")
      .insert({
        loan_id: loanId,
        type: "interest_payment",
        txn_date: paymentDate,
        amount: interestAmount,
        created_by: actorId,
      })
      .select("id")
      .single();
    if (txnError) throw new Error(txnError.message);

    await postLoanInterestEntry({
      loanTransactionId: txn.id,
      reference: loan.reference,
      amount: interestAmount,
      txnDate: paymentDate,
      actorId,
    });
  }

  await logAudit({
    userId: actorId,
    action: "payment",
    entity: "loan",
    entityId: loanId,
    before: null,
    after: { principalAmount, interestAmount, paymentDate },
  });
}

export async function createClient(name: string, clientType: ClientType): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("partners")
    .insert({ name, client_type: clientType, is_customer: true })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export interface CreatePartnerInput {
  name: string;
  clientType?: ClientType | null;
  isCustomer?: boolean;
  isVendor?: boolean;
  isEmployee?: boolean;
  isLender?: boolean;
  taxId?: string | null;
}

/** Generalizes createClient — the `partners_has_role` DB CHECK rejects an insert with every flag false. */
export async function createPartner(input: CreatePartnerInput, actorId: string): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("partners")
    .insert({
      name: input.name,
      client_type: input.clientType ?? null,
      is_customer: input.isCustomer ?? false,
      is_vendor: input.isVendor ?? false,
      is_employee: input.isEmployee ?? false,
      is_lender: input.isLender ?? false,
      tax_id: input.taxId ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await logAudit({
    userId: actorId,
    action: "create",
    entity: "partner",
    entityId: data.id,
    before: null,
    after: {
      name: input.name,
      isCustomer: input.isCustomer ?? false,
      isVendor: input.isVendor ?? false,
      isEmployee: input.isEmployee ?? false,
      isLender: input.isLender ?? false,
    },
  });
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
      partner_id: clientId,
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
