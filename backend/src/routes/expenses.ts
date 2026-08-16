import { Router } from "express";
import { requirePermission } from "../middleware/auth.js";
import {
  cancelDraftExpense,
  createExpense,
  isExpenseCategory,
  postExpense,
  updateExpense,
  voidExpense,
} from "../lib/mutations.js";
import { fetchExpenseDocumentById, fetchExpenseDocuments } from "../lib/queries.js";
import { isIsoDate } from "../lib/validate.js";

export const expensesRouter = Router();

const EXPENSE_STATUSES = ["draft", "posted", "cancelled"] as const;

expensesRouter.get("/", requirePermission("accounting.reports.read"), async (req, res) => {
  const { from, to, category, status, page, limit } = req.query;

  if (from !== undefined && !isIsoDate(from)) {
    res.status(400).json({ error: "from must be YYYY-MM-DD" });
    return;
  }
  if (to !== undefined && !isIsoDate(to)) {
    res.status(400).json({ error: "to must be YYYY-MM-DD" });
    return;
  }
  if (category !== undefined && (typeof category !== "string" || !isExpenseCategory(category))) {
    res.status(400).json({ error: "Invalid category" });
    return;
  }
  if (status !== undefined && !EXPENSE_STATUSES.includes(status as (typeof EXPENSE_STATUSES)[number])) {
    res.status(400).json({ error: `status must be one of ${EXPENSE_STATUSES.join(", ")}` });
    return;
  }

  const result = await fetchExpenseDocuments({
    from: typeof from === "string" ? from : undefined,
    to: typeof to === "string" ? to : undefined,
    category: typeof category === "string" && isExpenseCategory(category) ? category : undefined,
    status: status as (typeof EXPENSE_STATUSES)[number] | undefined,
    page: page !== undefined ? Number(page) : undefined,
    limit: limit !== undefined ? Number(limit) : undefined,
  });
  res.json(result);
});

expensesRouter.get("/:id", requirePermission("accounting.reports.read"), async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid expense id" });
    return;
  }
  const expense = await fetchExpenseDocumentById(id);
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  res.json(expense);
});

interface ExpenseWriteBody {
  category?: string;
  projectId?: string | null;
  description?: string;
  amount?: number;
  spentOn?: string;
  partnerId?: string | null;
  dueDate?: string | null;
  paidFromAccountId?: string | null;
}

function validateExpenseFields(
  body: ExpenseWriteBody,
  { requireAll }: { requireAll: boolean },
): { ok: true } | { ok: false; error: string } {
  const { category, projectId, description, amount, spentOn, partnerId, dueDate, paidFromAccountId } = body;

  if (requireAll || category !== undefined) {
    if (typeof category !== "string" || !isExpenseCategory(category)) {
      return { ok: false, error: "category must be payroll, operations, or project_costs" };
    }
  }
  if (requireAll || description !== undefined) {
    if (typeof description !== "string" || !description.trim()) {
      return { ok: false, error: "description is required" };
    }
  }
  if (requireAll || amount !== undefined) {
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: "amount must be a positive number" };
    }
  }
  if (requireAll || spentOn !== undefined) {
    if (!isIsoDate(spentOn)) {
      return { ok: false, error: "spentOn must be a valid date" };
    }
  }

  const isProjectCost = category === "project_costs";
  if (category !== undefined) {
    if (isProjectCost && (typeof projectId !== "string" || !projectId.trim())) {
      return { ok: false, error: "projectId is required for project costs" };
    }
    if (!isProjectCost && projectId != null && projectId !== "") {
      return { ok: false, error: "projectId is only allowed for project costs" };
    }
  }

  if (dueDate != null && dueDate !== "") {
    if (!isIsoDate(dueDate) || (spentOn && dueDate < spentOn)) {
      return { ok: false, error: "dueDate must be a valid date on or after spentOn" };
    }
    if (typeof partnerId !== "string" || !partnerId.trim()) {
      return { ok: false, error: "partnerId (the vendor) is required when dueDate is set" };
    }
  } else if (dueDate !== undefined && partnerId != null && partnerId !== "") {
    return { ok: false, error: "partnerId is only allowed alongside dueDate (a vendor bill)" };
  }

  if (paidFromAccountId != null && dueDate) {
    return { ok: false, error: "paidFromAccountId is only allowed for a cash expense (no dueDate)" };
  }

  return { ok: true };
}

expensesRouter.post("/", requirePermission("spending.write"), async (req, res) => {
  const body: ExpenseWriteBody = req.body ?? {};
  const validation = validateExpenseFields(body, { requireAll: true });
  if (!validation.ok) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const isProjectCost = body.category === "project_costs";
  const isVendorBill = body.dueDate != null && body.dueDate !== "";

  try {
    const { id } = await createExpense(
      {
        category: body.category as "payroll" | "operations" | "project_costs",
        projectId: isProjectCost ? (body.projectId ?? null) : null,
        description: (body.description as string).trim(),
        amount: body.amount as number,
        spentOn: body.spentOn as string,
        partnerId: isVendorBill ? body.partnerId : null,
        dueDate: isVendorBill ? body.dueDate : null,
        paidFromAccountId: isVendorBill ? null : (body.paidFromAccountId ?? null),
      },
      req.user!.id,
    );
    res.status(201).json({ id });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to create expense" });
  }
});

expensesRouter.patch("/:id", requirePermission("spending.write"), async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid expense id" });
    return;
  }
  const body: ExpenseWriteBody = req.body ?? {};
  const validation = validateExpenseFields(body, { requireAll: false });
  if (!validation.ok) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const isVendorBill = body.dueDate != null && body.dueDate !== "";
  try {
    await updateExpense(
      id,
      {
        category: body.category as "payroll" | "operations" | "project_costs" | undefined,
        projectId: body.projectId,
        description: body.description?.trim(),
        amount: body.amount,
        spentOn: body.spentOn,
        partnerId: body.dueDate !== undefined ? (isVendorBill ? body.partnerId : null) : undefined,
        dueDate: body.dueDate !== undefined ? (isVendorBill ? body.dueDate : null) : undefined,
        paidFromAccountId: body.paidFromAccountId,
      },
      req.user!.id,
    );
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update expense";
    res.status(message === "Only a draft expense can be edited" ? 409 : 400).json({ error: message });
  }
});

expensesRouter.post("/:id/post", requirePermission("spending.write"), async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid expense id" });
    return;
  }
  try {
    const result = await postExpense(id, req.user!.id);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to post expense";
    res.status(message === "Only a draft expense can be posted" ? 409 : 400).json({ error: message });
  }
});

expensesRouter.post("/:id/cancel", requirePermission("spending.write"), async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid expense id" });
    return;
  }
  try {
    await cancelDraftExpense(id, req.user!.id);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to cancel expense";
    res.status(message === "Only a draft expense can be cancelled" ? 409 : 400).json({ error: message });
  }
});

expensesRouter.patch("/:id/void", requirePermission("spending.write"), async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid expense id" });
    return;
  }
  try {
    await voidExpense(id, req.user!.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to void expense" });
  }
});
