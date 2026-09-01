import { Router } from "express";
import { requirePermission } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";
import { getToday } from "../lib/time.js";
import {
  postEntry,
  postDraftEntry,
  cancelDraftEntry,
  updateDraftEntry,
  postReversalEntry,
  type PostingLine,
} from "../lib/accounting/posting.js";
import { recordExpensePayment, createLoan, recordLoanRepayment } from "../lib/mutations.js";
import {
  fetchTrialBalance,
  fetchGeneralLedger,
  fetchFinancialSummary,
  fetchProjectPL,
  fetchArAging,
  fetchApAging,
  fetchDebtOutstanding,
  fetchMonthlyPL,
  fetchIncomeStatement,
  fetchCashFlow,
  CashFlowGranularity,
  fetchAllProjectPL,
  fetchJournalEntries,
  fetchJournalEntryById,
  type GeneralLedgerFilters,
} from "../lib/accounting/reports.js";
import { isIsoDate } from "../lib/validate.js";

export const accountingRouter = Router();

function todayIso(): string {
  return getToday().toISOString().slice(0, 10);
}

accountingRouter.get("/accounts", requirePermission("accounting.reports.read"), async (_req, res) => {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, code, name, type, subtype, parent_id, is_postable, is_active")
    .order("code");
  if (error) throw error;
  res.json({
    accounts: data.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      subtype: a.subtype,
      parentId: a.parent_id,
      isPostable: a.is_postable,
      isActive: a.is_active,
    })),
  });
});

accountingRouter.get("/trial-balance", requirePermission("accounting.reports.read"), async (req, res) => {
  const asOf = typeof req.query.asOf === "string" ? req.query.asOf : undefined;
  const rows = await fetchTrialBalance(asOf);
  res.json({ asOf: asOf ?? null, accounts: rows });
});

accountingRouter.get("/summary", requirePermission("accounting.reports.read"), async (req, res) => {
  const asOf = typeof req.query.asOf === "string" ? req.query.asOf : undefined;
  const summary = await fetchFinancialSummary(asOf);
  res.json(summary);
});

accountingRouter.get("/general-ledger", requirePermission("accounting.reports.read"), async (req, res) => {
  const { accountId, accountSubtype, projectId, partnerId, from, to } = req.query;
  const accountSubtypes = (
    Array.isArray(accountSubtype)
      ? accountSubtype.filter((s): s is string => typeof s === "string")
      : typeof accountSubtype === "string"
        ? [accountSubtype]
        : undefined
  ) as GeneralLedgerFilters["accountSubtypes"];
  const lines = await fetchGeneralLedger({
    accountId: typeof accountId === "string" ? accountId : undefined,
    accountSubtypes,
    projectId: typeof projectId === "string" ? projectId : undefined,
    partnerId: typeof partnerId === "string" ? partnerId : undefined,
    from: typeof from === "string" ? from : undefined,
    to: typeof to === "string" ? to : undefined,
  });
  res.json({ lines });
});

const ENTRY_STATUSES = ["draft", "posted", "cancelled"] as const;

/** Recent journal entries, newest first, server-paginated — see fetchJournalEntries for why this exists alongside /general-ledger. `status` defaults to "posted" (the only state that existed before draft support landed). */
accountingRouter.get("/entries", requirePermission("accounting.reports.read"), async (req, res) => {
  const { from, to, journalCode, status } = req.query;
  if (from !== undefined && !isIsoDate(from)) {
    res.status(400).json({ error: "from must be YYYY-MM-DD" });
    return;
  }
  if (to !== undefined && !isIsoDate(to)) {
    res.status(400).json({ error: "to must be YYYY-MM-DD" });
    return;
  }
  if (status !== undefined && !ENTRY_STATUSES.includes(status as (typeof ENTRY_STATUSES)[number])) {
    res.status(400).json({ error: "status must be draft, posted, or cancelled" });
    return;
  }

  const pageRaw = typeof req.query.page === "string" ? Number(req.query.page) : 1;
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.trunc(pageRaw)) : 1;
  const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 10;
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.trunc(limitRaw))) : 10;

  const result = await fetchJournalEntries(
    {
      from: isIsoDate(from) ? from : undefined,
      to: isIsoDate(to) ? to : undefined,
      journalCode: typeof journalCode === "string" ? journalCode : undefined,
      status: status as (typeof ENTRY_STATUSES)[number] | undefined,
    },
    page,
    limit,
  );
  res.json(result);
});

/** Single entry with its lines, names resolved — the journal-entry editor's detail view. */
accountingRouter.get("/entries/:id", requirePermission("accounting.reports.read"), async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid entry id" });
    return;
  }
  const entry = await fetchJournalEntryById(id);
  if (!entry) {
    res.status(404).json({ error: "Journal entry not found" });
    return;
  }
  res.json(entry);
});

accountingRouter.get(
  "/projects/:id/profitability",
  requirePermission("accounting.reports.read"),
  async (req, res) => {
    const asOf = typeof req.query.asOf === "string" ? req.query.asOf : undefined;
    const projectId = req.params.id;
    if (typeof projectId !== "string") {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }
    const pl = await fetchProjectPL(projectId, asOf);
    res.json(pl);
  },
);

/** All-projects profitability leaderboard — fn_project_pl (above) only covers one project at a time. */
accountingRouter.get("/project-profitability", requirePermission("accounting.reports.read"), async (req, res) => {
  const asOf = typeof req.query.asOf === "string" ? req.query.asOf : undefined;
  const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 10;
  const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, Math.trunc(limitRaw))) : 10;
  const projects = await fetchAllProjectPL(asOf, limit);
  res.json({ asOf: asOf ?? null, projects });
});

accountingRouter.get("/ar-aging", requirePermission("accounting.reports.read"), async (req, res) => {
  const asOf = typeof req.query.asOf === "string" ? req.query.asOf : todayIso();
  const { buckets, partners } = await fetchArAging(asOf);
  res.json({ asOf, buckets, partners });
});

accountingRouter.get("/ap-aging", requirePermission("accounting.reports.read"), async (req, res) => {
  const asOf = typeof req.query.asOf === "string" ? req.query.asOf : todayIso();
  const { buckets, partners } = await fetchApAging(asOf);
  res.json({ asOf, buckets, partners });
});

const LOAN_STATUSES = ["active", "settled", "cancelled"] as const;

accountingRouter.get("/debt", requirePermission("accounting.reports.read"), async (req, res) => {
  const { status } = req.query;
  if (status !== undefined && !LOAN_STATUSES.includes(status as (typeof LOAN_STATUSES)[number])) {
    res.status(400).json({ error: "status must be active, settled, or cancelled" });
    return;
  }
  const loans = await fetchDebtOutstanding(status as (typeof LOAN_STATUSES)[number] | undefined);
  res.json({ loans });
});

/** Revenue/expenses by month over a bounded [from, to] range — /summary is inception-to-date only, so period-scoped P&L needs this instead. */
accountingRouter.get("/pl-monthly", requirePermission("accounting.reports.read"), async (req, res) => {
  const { from, to } = req.query;
  if (!isIsoDate(from) || !isIsoDate(to)) {
    res.status(400).json({ error: "from and to are required, YYYY-MM-DD" });
    return;
  }
  if (from > to) {
    res.status(400).json({ error: "from must be on or before to" });
    return;
  }
  const months = await fetchMonthlyPL(from, to);
  res.json({ from, to, months });
});

/** Period income statement (revenue/expense lines, not just totals) — see fetchIncomeStatement for why /pl-monthly's month buckets aren't enough here. */
accountingRouter.get("/income-statement", requirePermission("accounting.reports.read"), async (req, res) => {
  const { from, to } = req.query;
  if (!isIsoDate(from) || !isIsoDate(to)) {
    res.status(400).json({ error: "from and to are required, YYYY-MM-DD" });
    return;
  }
  if (from > to) {
    res.status(400).json({ error: "from must be on or before to" });
    return;
  }
  const statement = await fetchIncomeStatement(from, to);
  res.json(statement);
});

const CASH_FLOW_GRANULARITIES: CashFlowGranularity[] = ["day", "week", "month"];

/** Cash movement over a bounded [from, to] range — no cash-flow statement/view exists yet, so this bridges the gap without touching the ledger's own tables. */
accountingRouter.get("/cash-flow", requirePermission("accounting.reports.read"), async (req, res) => {
  const { from, to, granularity } = req.query;
  if (!isIsoDate(from) || !isIsoDate(to)) {
    res.status(400).json({ error: "from and to are required, YYYY-MM-DD" });
    return;
  }
  if (from > to) {
    res.status(400).json({ error: "from must be on or before to" });
    return;
  }
  const gran = typeof granularity === "string" ? granularity : "day";
  if (!CASH_FLOW_GRANULARITIES.includes(gran as CashFlowGranularity)) {
    res.status(400).json({ error: "granularity must be day, week, or month" });
    return;
  }
  const result = await fetchCashFlow(from, to, gran as CashFlowGranularity);
  res.json(result);
});

interface ManualEntryLineInput {
  accountCode: string;
  partnerId?: string | null;
  projectId?: string | null;
  description?: string | null;
  debit: number;
  credit: number;
}

/**
 * Shared by POST /entries and PATCH /entries/:id — both take the same line
 * shape (account code, not id, since that's what a human types/picks in the
 * editor). Returns either the resolved lines or a ready-to-send 400 message;
 * the caller decides how to respond so this stays framework-agnostic.
 */
async function resolveManualLines(
  lines: unknown,
): Promise<{ ok: true; lines: PostingLine[] } | { ok: false; error: string }> {
  if (!Array.isArray(lines) || lines.length < 2) {
    return { ok: false, error: "At least 2 lines are required" };
  }

  const codes = [...new Set((lines as ManualEntryLineInput[]).map((l) => l.accountCode))];
  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("id, code")
    .in("code", codes);
  if (accountsError) throw accountsError;
  const accountIdByCode = new Map(accounts.map((a) => [a.code, a.id]));

  const resolvedLines: PostingLine[] = [];
  for (const line of lines as ManualEntryLineInput[]) {
    const accountId = accountIdByCode.get(line.accountCode);
    if (!accountId) {
      return { ok: false, error: `Unknown account code "${line.accountCode}"` };
    }
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;
    if ((debit > 0) === (credit > 0)) {
      return { ok: false, error: `Line for ${line.accountCode} must have exactly one of debit/credit > 0` };
    }
    resolvedLines.push({
      accountId,
      partnerId: line.partnerId ?? null,
      projectId: line.projectId ?? null,
      description: line.description ?? null,
      debit,
      credit,
    });
  }
  return { ok: true, lines: resolvedLines };
}

/**
 * Manual journal entry — superadmin/admin only (see root
 * CLAUDE.md: director edits plans/judgments, not records of fact).
 * `status: "draft"` saves it editable and out of every report; omitted (or
 * "posted") posts immediately, the only behavior that existed before the
 * journal-entry editor needed drafts.
 */
accountingRouter.post("/entries", requirePermission("accounting.manual-entry"), async (req, res) => {
  const { journalCode, accountingDate, description, reference, lines, status } = req.body ?? {};

  if (typeof journalCode !== "string" || !journalCode) {
    res.status(400).json({ error: "journalCode is required" });
    return;
  }
  if (typeof accountingDate !== "string" || !isIsoDate(accountingDate)) {
    res.status(400).json({ error: "accountingDate must be YYYY-MM-DD" });
    return;
  }
  if (typeof description !== "string" || !description.trim()) {
    res.status(400).json({ error: "description is required" });
    return;
  }
  if (status !== undefined && status !== "draft" && status !== "posted") {
    res.status(400).json({ error: 'status must be "draft" or "posted"' });
    return;
  }

  const resolved = await resolveManualLines(lines);
  if (!resolved.ok) {
    res.status(400).json({ error: resolved.error });
    return;
  }

  try {
    const entry = await postEntry({
      journalCode,
      accountingDate,
      reference: typeof reference === "string" ? reference : null,
      description,
      sourceType: "manual",
      lines: resolved.lines,
      actorId: req.user!.id,
      status,
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to create journal entry" });
  }
});

/** Replaces a draft entry's header fields and/or lines. 409 if the entry isn't a draft — posted entries are DB-trigger-immutable, correct with a reversal instead. */
accountingRouter.patch("/entries/:id", requirePermission("accounting.manual-entry"), async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid entry id" });
    return;
  }
  const { journalCode, accountingDate, description, reference, lines } = req.body ?? {};

  if (accountingDate !== undefined && !isIsoDate(accountingDate)) {
    res.status(400).json({ error: "accountingDate must be YYYY-MM-DD" });
    return;
  }
  if (description !== undefined && (typeof description !== "string" || !description.trim())) {
    res.status(400).json({ error: "description must not be empty" });
    return;
  }

  let resolvedLines: PostingLine[] | undefined;
  if (lines !== undefined) {
    const resolved = await resolveManualLines(lines);
    if (!resolved.ok) {
      res.status(400).json({ error: resolved.error });
      return;
    }
    resolvedLines = resolved.lines;
  }

  try {
    await updateDraftEntry(id, {
      journalCode: typeof journalCode === "string" ? journalCode : undefined,
      accountingDate,
      reference: reference === undefined ? undefined : typeof reference === "string" ? reference : null,
      description,
      lines: resolvedLines,
    });
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update journal entry";
    res.status(message === "Only a draft entry can be edited" ? 409 : 400).json({ error: message });
  }
});

/** Flips a draft entry to posted — trg_je_balanced (0002) does the real validation (>=2 lines, debit=credit, open fiscal period) on this exact transition. */
accountingRouter.post("/entries/:id/post", requirePermission("accounting.manual-entry"), async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid entry id" });
    return;
  }
  try {
    const entry = await postDraftEntry(id, req.user!.id);
    res.json(entry);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to post journal entry";
    res.status(message === "Entry not found or not a draft" ? 409 : 400).json({ error: message });
  }
});

/** Cancels a draft in place, or reverses a posted entry (the only correction path a posted entry allows — it's DB-trigger-immutable). */
accountingRouter.post("/entries/:id/cancel", requirePermission("accounting.manual-entry"), async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid entry id" });
    return;
  }
  const { data: existing, error } = await supabase.from("journal_entries").select("status").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!existing) {
    res.status(404).json({ error: "Journal entry not found" });
    return;
  }

  try {
    if (existing.status === "draft") {
      await cancelDraftEntry(id, req.user!.id);
      res.json({ ok: true });
    } else if (existing.status === "posted") {
      const reversal = await postReversalEntry(id, todayIso(), req.user!.id);
      res.json({ ok: true, reversal });
    } else {
      res.status(409).json({ error: "This entry is already cancelled" });
    }
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to cancel journal entry" });
  }
});

// ----------------------------------------------------------------------------
// Vendor bills — a vendor bill is just an expense row with due_date set
// (see budgetsRouter's POST /expenses). Payment against it lives here since
// there's no dedicated Expenses page — same rationale as everything else in
// this router.
// ----------------------------------------------------------------------------

accountingRouter.post("/vendor-bills/:id/payment", requirePermission("accounting.post"), async (req, res) => {
  const expenseId = req.params.id;
  const { amountPaid, paymentDate } = req.body ?? {};
  if (typeof expenseId !== "string") {
    res.status(400).json({ error: "Invalid expense id" });
    return;
  }
  if (typeof amountPaid !== "number" || !Number.isFinite(amountPaid) || amountPaid <= 0) {
    res.status(400).json({ error: "amountPaid must be a positive number" });
    return;
  }
  if (!isIsoDate(paymentDate)) {
    res.status(400).json({ error: "paymentDate must be YYYY-MM-DD" });
    return;
  }
  try {
    await recordExpensePayment(expenseId, amountPaid, paymentDate, req.user!.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to record payment" });
  }
});

// ----------------------------------------------------------------------------
// Loans
// ----------------------------------------------------------------------------

accountingRouter.post("/loans", requirePermission("accounting.post"), async (req, res) => {
  const { reference, lenderPartnerId, liabilityAccountId, principalAmount, interestRatePct, startDate, maturityDate } =
    req.body ?? {};

  if (typeof reference !== "string" || !reference.trim()) {
    res.status(400).json({ error: "reference is required" });
    return;
  }
  if (typeof lenderPartnerId !== "string" || !lenderPartnerId.trim()) {
    res.status(400).json({ error: "lenderPartnerId is required" });
    return;
  }
  if (typeof liabilityAccountId !== "string" || !liabilityAccountId.trim()) {
    res.status(400).json({ error: "liabilityAccountId is required" });
    return;
  }
  if (typeof principalAmount !== "number" || !Number.isFinite(principalAmount) || principalAmount <= 0) {
    res.status(400).json({ error: "principalAmount must be a positive number" });
    return;
  }
  if (!isIsoDate(startDate)) {
    res.status(400).json({ error: "startDate must be YYYY-MM-DD" });
    return;
  }
  if (maturityDate != null && maturityDate !== "" && !isIsoDate(maturityDate)) {
    res.status(400).json({ error: "maturityDate must be YYYY-MM-DD" });
    return;
  }

  try {
    const loan = await createLoan(
      {
        reference: reference.trim(),
        lenderPartnerId,
        liabilityAccountId,
        principalAmount,
        interestRatePct: typeof interestRatePct === "number" ? interestRatePct : null,
        startDate,
        maturityDate: maturityDate || null,
      },
      req.user!.id,
    );
    res.status(201).json(loan);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to create loan" });
  }
});

accountingRouter.post("/loans/:id/repayment", requirePermission("accounting.post"), async (req, res) => {
  const loanId = req.params.id;
  const { principalAmount, interestAmount, paymentDate } = req.body ?? {};
  const principal = typeof principalAmount === "number" ? principalAmount : 0;
  const interest = typeof interestAmount === "number" ? interestAmount : 0;
  if (typeof loanId !== "string") {
    res.status(400).json({ error: "Invalid loan id" });
    return;
  }
  if (!isIsoDate(paymentDate)) {
    res.status(400).json({ error: "paymentDate must be YYYY-MM-DD" });
    return;
  }
  try {
    await recordLoanRepayment(loanId, principal, interest, paymentDate, req.user!.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to record repayment" });
  }
});

// ----------------------------------------------------------------------------
// Fiscal periods — the DB trigger already blocks posting into a closed
// period once a row exists; this just manages those rows (empty = every
// period is implicitly open).
// ----------------------------------------------------------------------------

accountingRouter.get("/fiscal-periods", requirePermission("accounting.reports.read"), async (_req, res) => {
  const { data, error } = await supabase
    .from("fiscal_periods")
    .select("id, period, status")
    .order("period");
  if (error) throw error;
  res.json({ periods: data });
});

accountingRouter.put("/fiscal-periods/:period", requirePermission("coa.manage"), async (req, res) => {
  const period = req.params.period;
  const { status } = req.body ?? {};
  if (!isIsoDate(period) || !period.endsWith("-01")) {
    res.status(400).json({ error: "period must be YYYY-MM-01" });
    return;
  }
  if (status !== "open" && status !== "closed") {
    res.status(400).json({ error: 'status must be "open" or "closed"' });
    return;
  }
  const { error } = await supabase
    .from("fiscal_periods")
    .upsert({ period, status }, { onConflict: "period" });
  if (error) throw error;
  res.json({ ok: true });
});
