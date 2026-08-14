/**
 * The posting engine: every write that has a financial effect (invoice,
 * payment, expense, ...) generates one balanced journal entry through this
 * file. The double-entry invariants themselves (>=2 lines, debit=credit,
 * posted-immutable, closed-period lock) are enforced by database triggers
 * (see 0002_accounting_core.sql) — this module's job is just to build the
 * right lines and hand them to postEntry().
 *
 * postEntry()'s three writes (entry insert, lines insert, status flip) run
 * inside a single Postgres function (`post_journal_entry`, 0009) called via
 * one `supabase.rpc()` round trip — so a rejection at any step (e.g. posting
 * into a closed fiscal period, only checked by the trigger on the final
 * status flip) rolls back the whole thing. No orphaned draft entries.
 */
import { supabase } from "../supabase.js";
import type { Database } from "../../types/database.js";
import { resolveAccount, resolveJournal, resolveJournalCodeForAccount, expenseAccountKey } from "./coa.js";

type EntrySource = Database["public"]["Enums"]["entry_source"];
type ExpenseCategory = Database["public"]["Enums"]["expense_category"];

export interface PostingLine {
  accountId: string;
  partnerId?: string | null;
  projectId?: string | null;
  description?: string | null;
  debit: number;
  credit: number;
}

export interface PostEntryInput {
  journalCode: string;
  accountingDate: string;
  reference?: string | null;
  description: string;
  sourceType: EntrySource;
  /** Required unless sourceType is "manual" — mirrors the journal_entries CHECK constraint. */
  sourceId?: string | null;
  reversalOfId?: string | null;
  lines: PostingLine[];
  actorId: string;
  /** "draft" leaves the entry editable and out of every report (reports filter status='posted'); omitted = "posted", unchanged from before draft support existed. Every document-specific poster below omits this — only the manual journal-entry editor uses "draft". */
  status?: "draft" | "posted";
}

export interface PostedEntry {
  id: string;
  entryNumber: string;
}

/** Inserts an entry + its lines, then posts it unless `status: "draft"` was requested — the single gate every document-specific poster below goes through. Runs as one atomic RPC (see 0009_post_journal_entry_atomic.sql, extended by 0013 for draft support). */
export async function postEntry(input: PostEntryInput): Promise<PostedEntry> {
  const status = input.status ?? "posted";
  if (status === "posted") {
    if (input.lines.length < 2) {
      throw new Error(`Journal entry needs at least 2 lines, got ${input.lines.length}`);
    }
    const totalDebit = input.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = input.lines.reduce((s, l) => s + l.credit, 0);
    if (totalDebit !== totalCredit) {
      throw new Error(`Journal entry is not balanced: debit ${totalDebit} <> credit ${totalCredit}`);
    }
  }
  if (input.sourceType !== "manual" && !input.sourceId) {
    throw new Error(`sourceId is required for sourceType "${input.sourceType}"`);
  }

  const journalId = await resolveJournal(input.journalCode);

  const { data, error } = await supabase.rpc("post_journal_entry", {
    p_journal_id: journalId,
    p_journal_code: input.journalCode,
    p_accounting_date: input.accountingDate,
    p_reference: input.reference ?? null,
    p_description: input.description,
    p_source_type: input.sourceType,
    p_source_id: input.sourceId ?? null,
    p_reversal_of_id: input.reversalOfId ?? null,
    p_actor_id: input.actorId,
    p_lines: input.lines.map((line) => ({
      accountId: line.accountId,
      partnerId: line.partnerId ?? null,
      projectId: line.projectId ?? null,
      description: line.description ?? null,
      debit: line.debit,
      credit: line.credit,
    })),
    p_status: status,
  });
  if (error) throw new Error(error.message);
  const row = data[0];
  if (!row) throw new Error("post_journal_entry returned no row");
  return { id: row.id, entryNumber: row.entry_number };
}

/**
 * Flips a draft entry to posted. A plain UPDATE, not the RPC above (there's
 * no new entry_number to allocate) — `trg_je_balanced` (0002) fires on
 * exactly this transition and does the real validation (>=2 lines,
 * debit=credit, fiscal period open), so this function's job is just to
 * scope the update to a draft row and surface the trigger's rejection as a
 * normal error. Throws the literal "Entry not found or not a draft" (same
 * message as cancelDraftEntry) when the row didn't match — routes match on
 * that string to answer 409 instead of guessing from a PostgREST error code.
 */
export async function postDraftEntry(id: string, actorId: string): Promise<PostedEntry> {
  const { data, error } = await supabase
    .from("journal_entries")
    .update({ status: "posted", posted_by: actorId })
    .eq("id", id)
    .eq("status", "draft")
    .select("id, entry_number")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Entry not found or not a draft");
  return { id: data.id, entryNumber: data.entry_number };
}

/**
 * Cancels a draft entry in place — no DB trigger blocks a draft->cancelled
 * transition (only posted rows are immutable), so this is a plain UPDATE.
 * A posted entry must be reversed instead (postReversalEntry below); the
 * caller is responsible for routing to the right one based on status.
 */
export async function cancelDraftEntry(id: string, actorId: string): Promise<void> {
  const { data, error } = await supabase
    .from("journal_entries")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Entry not found or not a draft");
  void actorId; // no audit trail on journal_entries yet — kept for a consistent call signature with the rest of this module
}

/**
 * Replaces every line on a draft entry (delete + reinsert, both allowed by
 * `trg_je_lines_immutable` while the entry is still draft) and optionally
 * its header fields. Deliberately does not require the lines to balance —
 * Odoo allows saving an unbalanced draft; `trg_je_balanced` is the real gate
 * and only fires when postDraftEntry flips it to posted.
 */
export async function updateDraftEntry(
  id: string,
  patch: {
    journalCode?: string;
    accountingDate?: string;
    reference?: string | null;
    description?: string;
    lines?: PostingLine[];
  },
): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("journal_entries")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error("Entry not found");
  if (existing.status !== "draft") throw new Error("Only a draft entry can be edited");

  const headerPatch: Database["public"]["Tables"]["journal_entries"]["Update"] = {};
  if (patch.accountingDate !== undefined) headerPatch.accounting_date = patch.accountingDate;
  if (patch.reference !== undefined) headerPatch.reference = patch.reference;
  if (patch.description !== undefined) headerPatch.description = patch.description;
  if (patch.journalCode !== undefined) headerPatch.journal_id = await resolveJournal(patch.journalCode);

  if (Object.keys(headerPatch).length > 0) {
    const { error } = await supabase.from("journal_entries").update(headerPatch).eq("id", id);
    if (error) throw new Error(error.message);
  }

  if (patch.lines) {
    const { error: deleteError } = await supabase.from("journal_entry_lines").delete().eq("journal_entry_id", id);
    if (deleteError) throw new Error(deleteError.message);

    const { error: insertError } = await supabase.from("journal_entry_lines").insert(
      patch.lines.map((line, i) => ({
        journal_entry_id: id,
        line_no: i + 1,
        account_id: line.accountId,
        partner_id: line.partnerId ?? null,
        project_id: line.projectId ?? null,
        description: line.description ?? null,
        debit: line.debit,
        credit: line.credit,
      })),
    );
    if (insertError) throw new Error(insertError.message);
  }
}

// ----------------------------------------------------------------------------
// Document-specific posters
// ----------------------------------------------------------------------------

/** Invoice issued: Dr Accounts Receivable / Cr Project Revenue. */
export async function postInvoiceEntry(params: {
  invoiceId: string;
  invoiceNumber: string;
  partnerId: string;
  projectId: string;
  amount: number;
  issuedDate: string;
  actorId: string;
}): Promise<PostedEntry> {
  const [arAccount, revenueAccount] = await Promise.all([
    resolveAccount("ar_account"),
    resolveAccount("revenue_project"),
  ]);
  return postEntry({
    journalCode: "SAL",
    accountingDate: params.issuedDate,
    reference: params.invoiceNumber,
    description: `Invoice ${params.invoiceNumber}`,
    sourceType: "invoice",
    sourceId: params.invoiceId,
    actorId: params.actorId,
    lines: [
      {
        accountId: arAccount,
        partnerId: params.partnerId,
        debit: params.amount,
        credit: 0,
        description: `Accounts receivable — ${params.invoiceNumber}`,
      },
      {
        accountId: revenueAccount,
        projectId: params.projectId,
        debit: 0,
        credit: params.amount,
        description: `Revenue — ${params.invoiceNumber}`,
      },
    ],
  });
}

/** Customer payment received: Dr Bank / Cr Accounts Receivable. */
export async function postInvoicePaymentEntry(params: {
  paymentId: string;
  invoiceNumber: string;
  partnerId: string;
  amount: number;
  paymentDate: string;
  actorId: string;
}): Promise<PostedEntry> {
  const [bankAccount, arAccount] = await Promise.all([
    resolveAccount("default_bank"),
    resolveAccount("ar_account"),
  ]);
  return postEntry({
    journalCode: "BNK1",
    accountingDate: params.paymentDate,
    reference: params.invoiceNumber,
    description: `Payment received — ${params.invoiceNumber}`,
    sourceType: "payment",
    sourceId: params.paymentId,
    actorId: params.actorId,
    lines: [
      {
        accountId: bankAccount,
        debit: params.amount,
        credit: 0,
        description: `Payment received — ${params.invoiceNumber}`,
      },
      {
        accountId: arAccount,
        partnerId: params.partnerId,
        debit: 0,
        credit: params.amount,
        description: `Settle A/R — ${params.invoiceNumber}`,
      },
    ],
  });
}

/** Cash expense: Dr Expense / Cr Bank. (Vendor bills — Dr Expense / Cr Accounts Payable — are a follow-up once the expense-write path grows a `dueDate` field on its input.) */
export async function postExpenseEntry(params: {
  expenseId: string;
  category: ExpenseCategory;
  projectId: string | null;
  partnerId: string | null;
  description: string;
  amount: number;
  spentOn: string;
  actorId: string;
  /** Which bank/cash account the money actually left from. Omitted falls back to the default bank (Bank BCA / BNK1) for backwards compatibility. */
  paidFromAccountId?: string | null;
}): Promise<PostedEntry> {
  const [expenseAccount, bankAccount] = await Promise.all([
    resolveAccount(expenseAccountKey(params.category)),
    params.paidFromAccountId ? Promise.resolve(params.paidFromAccountId) : resolveAccount("default_bank"),
  ]);
  const journalCode = await resolveJournalCodeForAccount(bankAccount);
  return postEntry({
    journalCode,
    accountingDate: params.spentOn,
    description: params.description,
    sourceType: "expense",
    sourceId: params.expenseId,
    actorId: params.actorId,
    lines: [
      {
        accountId: expenseAccount,
        projectId: params.projectId,
        partnerId: params.partnerId,
        debit: params.amount,
        credit: 0,
        description: params.description,
      },
      {
        accountId: bankAccount,
        debit: 0,
        credit: params.amount,
        description: `Cash paid — ${params.description}`,
      },
    ],
  });
}

/** Vendor bill, unpaid: Dr Expense / Cr Accounts Payable. */
export async function postVendorBillEntry(params: {
  expenseId: string;
  category: ExpenseCategory;
  projectId: string | null;
  partnerId: string;
  description: string;
  amount: number;
  spentOn: string;
  actorId: string;
}): Promise<PostedEntry> {
  const [expenseAccount, apAccount] = await Promise.all([
    resolveAccount(expenseAccountKey(params.category)),
    resolveAccount("ap_account"),
  ]);
  return postEntry({
    journalCode: "PUR",
    accountingDate: params.spentOn,
    description: params.description,
    sourceType: "expense",
    sourceId: params.expenseId,
    actorId: params.actorId,
    lines: [
      {
        accountId: expenseAccount,
        projectId: params.projectId,
        partnerId: params.partnerId,
        debit: params.amount,
        credit: 0,
        description: params.description,
      },
      {
        accountId: apAccount,
        partnerId: params.partnerId,
        debit: 0,
        credit: params.amount,
        description: `Accounts payable — ${params.description}`,
      },
    ],
  });
}

/** Vendor bill paid: Dr Accounts Payable / Cr Bank. */
export async function postVendorPaymentEntry(params: {
  paymentId: string;
  partnerId: string;
  description: string;
  amount: number;
  paymentDate: string;
  actorId: string;
}): Promise<PostedEntry> {
  const [apAccount, bankAccount] = await Promise.all([
    resolveAccount("ap_account"),
    resolveAccount("default_bank"),
  ]);
  return postEntry({
    journalCode: "BNK1",
    accountingDate: params.paymentDate,
    description: `Payment sent — ${params.description}`,
    sourceType: "payment",
    sourceId: params.paymentId,
    actorId: params.actorId,
    lines: [
      {
        accountId: apAccount,
        partnerId: params.partnerId,
        debit: params.amount,
        credit: 0,
        description: `Settle A/P — ${params.description}`,
      },
      {
        accountId: bankAccount,
        debit: 0,
        credit: params.amount,
        description: `Payment sent — ${params.description}`,
      },
    ],
  });
}

/** Loan received: Dr Bank / Cr the loan's liability account. */
export async function postLoanDisbursementEntry(params: {
  loanTransactionId: string;
  reference: string;
  lenderPartnerId: string;
  liabilityAccountId: string;
  amount: number;
  txnDate: string;
  actorId: string;
}): Promise<PostedEntry> {
  const bankAccount = await resolveAccount("default_bank");
  return postEntry({
    journalCode: "BNK1",
    accountingDate: params.txnDate,
    reference: params.reference,
    description: `Loan disbursement — ${params.reference}`,
    sourceType: "loan_transaction",
    sourceId: params.loanTransactionId,
    actorId: params.actorId,
    lines: [
      { accountId: bankAccount, debit: params.amount, credit: 0, description: `Loan disbursement — ${params.reference}` },
      {
        accountId: params.liabilityAccountId,
        partnerId: params.lenderPartnerId,
        debit: 0,
        credit: params.amount,
        description: `Loan disbursement — ${params.reference}`,
      },
    ],
  });
}

/** Loan principal repaid: Dr the loan's liability account / Cr Bank. */
export async function postLoanRepaymentEntry(params: {
  loanTransactionId: string;
  reference: string;
  lenderPartnerId: string;
  liabilityAccountId: string;
  amount: number;
  txnDate: string;
  actorId: string;
}): Promise<PostedEntry> {
  const bankAccount = await resolveAccount("default_bank");
  return postEntry({
    journalCode: "BNK1",
    accountingDate: params.txnDate,
    reference: params.reference,
    description: `Loan principal repayment — ${params.reference}`,
    sourceType: "loan_transaction",
    sourceId: params.loanTransactionId,
    actorId: params.actorId,
    lines: [
      {
        accountId: params.liabilityAccountId,
        partnerId: params.lenderPartnerId,
        debit: params.amount,
        credit: 0,
        description: `Loan principal repayment — ${params.reference}`,
      },
      { accountId: bankAccount, debit: 0, credit: params.amount, description: `Loan principal repayment — ${params.reference}` },
    ],
  });
}

/** Loan interest paid: Dr Interest Expense / Cr Bank. */
export async function postLoanInterestEntry(params: {
  loanTransactionId: string;
  reference: string;
  amount: number;
  txnDate: string;
  actorId: string;
}): Promise<PostedEntry> {
  const [interestAccount, bankAccount] = await Promise.all([
    resolveAccount("interest_expense"),
    resolveAccount("default_bank"),
  ]);
  return postEntry({
    journalCode: "BNK1",
    accountingDate: params.txnDate,
    reference: params.reference,
    description: `Loan interest — ${params.reference}`,
    sourceType: "loan_transaction",
    sourceId: params.loanTransactionId,
    actorId: params.actorId,
    lines: [
      { accountId: interestAccount, debit: params.amount, credit: 0, description: `Loan interest — ${params.reference}` },
      { accountId: bankAccount, debit: 0, credit: params.amount, description: `Loan interest — ${params.reference}` },
    ],
  });
}

/**
 * Reverses a posted entry: a new entry with every line's debit/credit
 * swapped, linked via reversal_of_id. The only way to correct a posted
 * entry — the DB triggers forbid editing or deleting one directly. The
 * unique index on (source_type, source_id) means an entry can only be
 * reversed once.
 */
export async function postReversalEntry(
  originalEntryId: string,
  accountingDate: string,
  actorId: string,
): Promise<PostedEntry> {
  const { data: original, error: entryError } = await supabase
    .from("journal_entries")
    .select("id, journal_id, entry_number, description, status, journals!inner(code)")
    .eq("id", originalEntryId)
    .single();
  if (entryError) throw new Error(entryError.message);
  if (original.status !== "posted") throw new Error("Only a posted entry can be reversed");

  const journalCode = (original.journals as unknown as { code: string }).code;

  const { data: lines, error: linesError } = await supabase
    .from("journal_entry_lines")
    .select("account_id, partner_id, project_id, description, debit, credit")
    .eq("journal_entry_id", originalEntryId)
    .order("line_no");
  if (linesError) throw new Error(linesError.message);

  return postEntry({
    journalCode,
    accountingDate,
    description: `Reversal of ${original.entry_number} — ${original.description}`,
    sourceType: "reversal",
    sourceId: originalEntryId,
    reversalOfId: originalEntryId,
    actorId,
    lines: lines.map((line) => ({
      accountId: line.account_id,
      partnerId: line.partner_id,
      projectId: line.project_id,
      description: line.description,
      debit: line.credit,
      credit: line.debit,
    })),
  });
}
