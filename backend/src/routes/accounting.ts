import { Router } from "express";
import { requirePermission } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";
import { getToday } from "../lib/time.js";
import { postEntry } from "../lib/accounting/posting.js";
import { recordExpensePayment, createLoan, recordLoanRepayment } from "../lib/mutations.js";
import {
  fetchTrialBalance,
  fetchGeneralLedger,
  fetchFinancialSummary,
  fetchProjectPL,
  fetchArAging,
  fetchApAging,
  fetchDebtOutstanding,
} from "../lib/accounting/reports.js";

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
  res.json({ accounts: data });
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
  const { accountId, projectId, partnerId, from, to } = req.query;
  const lines = await fetchGeneralLedger({
    accountId: typeof accountId === "string" ? accountId : undefined,
    projectId: typeof projectId === "string" ? projectId : undefined,
    partnerId: typeof partnerId === "string" ? partnerId : undefined,
    from: typeof from === "string" ? from : undefined,
    to: typeof to === "string" ? to : undefined,
  });
  res.json({ lines });
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

accountingRouter.get("/ar-aging", requirePermission("accounting.reports.read"), async (req, res) => {
  const asOf = typeof req.query.asOf === "string" ? req.query.asOf : todayIso();
  const buckets = await fetchArAging(asOf);
  res.json({ asOf, buckets });
});

accountingRouter.get("/ap-aging", requirePermission("accounting.reports.read"), async (req, res) => {
  const asOf = typeof req.query.asOf === "string" ? req.query.asOf : todayIso();
  const buckets = await fetchApAging(asOf);
  res.json({ asOf, buckets });
});

accountingRouter.get("/debt", requirePermission("accounting.reports.read"), async (_req, res) => {
  const loans = await fetchDebtOutstanding();
  res.json({ loans });
});

interface ManualEntryLineInput {
  accountCode: string;
  partnerId?: string | null;
  projectId?: string | null;
  description?: string | null;
  debit: number;
  credit: number;
}

/** Manual journal entry — superadmin/admin only (see root CLAUDE.md: director edits plans/judgments, not records of fact). */
accountingRouter.post("/entries", requirePermission("accounting.manual-entry"), async (req, res) => {
  const { journalCode, accountingDate, description, reference, lines } = req.body ?? {};

  if (typeof journalCode !== "string" || !journalCode) {
    res.status(400).json({ error: "journalCode is required" });
    return;
  }
  if (typeof accountingDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(accountingDate)) {
    res.status(400).json({ error: "accountingDate must be YYYY-MM-DD" });
    return;
  }
  if (typeof description !== "string" || !description.trim()) {
    res.status(400).json({ error: "description is required" });
    return;
  }
  if (!Array.isArray(lines) || lines.length < 2) {
    res.status(400).json({ error: "At least 2 lines are required" });
    return;
  }

  const codes = [...new Set((lines as ManualEntryLineInput[]).map((l) => l.accountCode))];
  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("id, code")
    .in("code", codes);
  if (accountsError) throw accountsError;
  const accountIdByCode = new Map(accounts.map((a) => [a.code, a.id]));

  const resolvedLines = [];
  for (const line of lines as ManualEntryLineInput[]) {
    const accountId = accountIdByCode.get(line.accountCode);
    if (!accountId) {
      res.status(400).json({ error: `Unknown account code "${line.accountCode}"` });
      return;
    }
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;
    if ((debit > 0) === (credit > 0)) {
      res.status(400).json({ error: `Line for ${line.accountCode} must have exactly one of debit/credit > 0` });
      return;
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

  const entry = await postEntry({
    journalCode,
    accountingDate,
    reference: typeof reference === "string" ? reference : null,
    description,
    sourceType: "manual",
    lines: resolvedLines,
    actorId: req.user!.id,
  });

  res.status(201).json(entry);
});

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

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
