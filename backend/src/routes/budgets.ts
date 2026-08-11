import { Router } from "express";
import { spentByProject } from "../lib/aggregate.js";
import { budgetHealth, type BudgetHealth } from "../lib/derive.js";
import { requirePermission } from "../middleware/auth.js";
import {
  createExpense,
  isExpenseCategory,
  updateCategoryBudget,
  voidExpense,
  type ExpenseCategory,
} from "../lib/mutations.js";
import {
  fetchCategoryBudgetPeriods,
  fetchCategoryBudgets,
  fetchExpenses,
  fetchProjects,
} from "../lib/queries.js";
import { getToday, monthStart } from "../lib/time.js";
import { formatRupiah, periodLabel } from "../lib/format.js";

export const budgetsRouter = Router();

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const CATEGORY_LABELS = {
  payroll: "Payroll",
  operations: "Operations",
  project_costs: "Project costs",
} as const;

interface BudgetItem {
  id: string;
  name: string;
  subtitle?: string;
  budget: number | null;
  spent: number;
  health: BudgetHealth | null;
}

/** "June 2026" from a YYYY-MM-01 period string (pure date-math, not "today"). */
function periodStringLabel(period: string): string {
  return periodLabel(new Date(`${period}T00:00:00Z`));
}

function sumTotals(items: BudgetItem[]) {
  // Only items that have a plan count toward "budget"; spend always counts.
  const budget = items.reduce((s, b) => s + (b.budget ?? 0), 0);
  const spent = items.reduce((s, b) => s + b.spent, 0);
  return {
    budget,
    spent,
    remaining: budget - spent,
    pctUsed: budget === 0 ? 0 : Math.round((spent / budget) * 100),
  };
}

budgetsRouter.get("/", async (req, res) => {
  const today = getToday();
  const currentPeriod = monthStart(today);

  const scopeParam = req.query.scope;
  let scopeKind: "month" | "all";
  let period: string | null;
  if (scopeParam === undefined || scopeParam === "") {
    scopeKind = "month";
    period = currentPeriod;
  } else if (scopeParam === "all") {
    scopeKind = "all";
    period = null;
  } else if (typeof scopeParam === "string" && /^\d{4}-(0[1-9]|1[0-2])-01$/.test(scopeParam)) {
    scopeKind = "month";
    period = scopeParam;
  } else {
    res.status(400).json({ error: 'scope must be "all" or a month like 2026-06-01' });
    return;
  }

  const [budgetRows, expenseRows, projectRows, budgetPeriods] = await Promise.all([
    fetchCategoryBudgets(period ?? currentPeriod),
    fetchExpenses(),
    fetchProjects(),
    fetchCategoryBudgetPeriods(),
  ]);

  // Months the select can switch to: any month with spending or a plan,
  // excluding the current month (it gets its own "This month" option).
  const monthSet = new Set<string>(budgetPeriods);
  for (const e of expenseRows) monthSet.add(`${e.spent_on.slice(0, 7)}-01`);
  monthSet.delete(currentPeriod);
  const availableMonths = [...monthSet]
    .sort()
    .reverse()
    .map((p) => ({ period: p, label: periodStringLabel(p) }));

  const isCurrent = period === currentPeriod;
  const scope = {
    kind: scopeKind,
    period,
    label: scopeKind === "all" ? "All time" : periodStringLabel(period as string),
    isCurrent,
  };

  const allTimeProjectSpent = spentByProject(expenseRows);
  const budgetInsights: string[] = [];
  let categoryBudgets: BudgetItem[];
  let projectBudgets: BudgetItem[];
  let totals;
  let projectNote: string;

  if (scopeKind === "month") {
    const monthExpenses = expenseRows.filter(
      (e) => e.spent_on.slice(0, 7) === (period as string).slice(0, 7),
    );

    // All 3 categories, whether or not a plan row exists for this month —
    // spend is still worth showing, the card just says "no plan set".
    categoryBudgets = (Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => {
      const plan = budgetRows.find((b) => b.category === cat) ?? null;
      const spent = monthExpenses
        .filter((e) => e.category === cat)
        .reduce((s, e) => s + e.amount, 0);
      return {
        id: `cat-${cat}`,
        name: CATEGORY_LABELS[cat],
        budget: plan?.planned_amount ?? null,
        spent,
        health: plan ? budgetHealth(plan.planned_amount, spent) : null,
      };
    });

    // Every project, whether or not it spent anything this month — hiding
    // zero-spend projects made the list look incomplete (only 5 of 12
    // showed up with the seed data). No health: project budgets cap the
    // whole project, so a single month has nothing to compare against.
    const monthProjectSpent = spentByProject(monthExpenses);
    projectBudgets = projectRows
      .map((p) => ({
        id: p.id,
        name: p.name,
        subtitle: p.client.name,
        budget: null,
        spent: monthProjectSpent.get(p.id) ?? 0,
        health: null,
      }))
      .sort((a, b) => b.spent - a.spent);

    totals = sumTotals(categoryBudgets);

    const inMonth = isCurrent ? "this month" : `in ${scope.label}`;
    for (const b of categoryBudgets) {
      if (b.health?.kind === "over") {
        budgetInsights.push(
          `${b.name} spent ${formatRupiah(b.spent - (b.budget as number))} more than planned ${inMonth}.`
        );
      }
    }
    if (isCurrent) {
      let mostHeadroomCat = null;
      let maxHeadroom = 0;
      for (const b of categoryBudgets) {
        const headroom = (b.budget ?? 0) - b.spent;
        if (headroom > maxHeadroom) {
          maxHeadroom = headroom;
          mostHeadroomCat = b.name;
        }
      }
      if (mostHeadroomCat && maxHeadroom > 0) {
        budgetInsights.push(
          `${formatRupiah(maxHeadroom)} still left to spend on ${mostHeadroomCat.toLowerCase()} this month.`
        );
      }
    }

    const monthProjectTotal = projectBudgets.reduce((s, p) => s + p.spent, 0);
    projectNote =
      monthProjectTotal === 0
        ? `No project spending recorded ${inMonth}.`
        : `Projects spent ${formatRupiah(monthProjectTotal)} ${inMonth}. Project budgets cover the whole project — switch to "All time" to compare against them.`;
  } else {
    // All time: spend per category with no plan to compare (plans are
    // monthly), and project budgets vs cumulative spend — their home view.
    categoryBudgets = (Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => ({
      id: `cat-${cat}`,
      name: CATEGORY_LABELS[cat],
      budget: null,
      spent: expenseRows
        .filter((e) => e.category === cat)
        .reduce((s, e) => s + e.amount, 0),
      health: null,
    }));

    // Budgeted projects keep their cap + health chip; unbudgeted ones still
    // show up (spend-only, no cap to compare against) — hiding them made 7
    // of 12 projects invisible even though their spend is already counted
    // in the category totals above. Ring/totals stay scoped to the
    // budgeted subset only, so "budget" and "spent" always describe the
    // same set of projects (mixing in unbudgeted spend would inflate
    // "spent" against a "budget" that never accounted for it).
    const budgetedProjects = projectRows
      .filter((p) => p.budget !== null)
      .map((p) => {
        const spent = allTimeProjectSpent.get(p.id) ?? 0;
        return {
          id: p.id,
          name: p.name,
          subtitle: p.client.name,
          budget: p.budget as number,
          spent,
          health: budgetHealth(p.budget as number, spent),
        };
      });
    const unbudgetedProjects = projectRows
      .filter((p) => p.budget === null)
      .map((p) => ({
        id: p.id,
        name: p.name,
        subtitle: p.client.name,
        budget: null,
        spent: allTimeProjectSpent.get(p.id) ?? 0,
        health: null,
      }));

    totals = sumTotals(budgetedProjects);
    projectBudgets = [...budgetedProjects, ...unbudgetedProjects].sort(
      (a, b) => (b.health?.pctUsed ?? -1) - (a.health?.pctUsed ?? -1) || b.spent - a.spent,
    );

    for (const p of budgetedProjects) {
      if (p.health.kind === "over") {
        const pctOver = Math.round((p.spent / p.budget - 1) * 100);
        budgetInsights.push(
          `${p.name} is ${pctOver}% over its project budget — see Needs attention on the Dashboard.`
        );
      }
    }

    const overCount = budgetedProjects.filter((p) => p.health.kind === "over").length;
    projectNote =
      `${formatRupiah(totals.budget)} planned across ${budgetedProjects.length} projects · Spent ${formatRupiah(totals.spent)}` +
      (overCount > 0 ? ` · ${overCount} over budget` : "") +
      ". Each budget covers the whole project from start to finish.";
  }

  res.json({
    scope,
    availableMonths,
    categoryBudgets,
    projectBudgets,
    totals,
    projectNote,
    budgetInsights,
  });
});

budgetsRouter.patch("/categories/:category", requirePermission("budgets.edit"), async (req, res) => {
  const { category } = req.params;
  const { plannedAmount } = req.body ?? {};
  if (typeof category !== "string" || !isExpenseCategory(category)) {
    res.status(400).json({ error: `Invalid category "${category}"` });
    return;
  }
  if (typeof plannedAmount !== "number" || !Number.isFinite(plannedAmount) || plannedAmount < 0) {
    res.status(400).json({ error: "plannedAmount must be a non-negative number" });
    return;
  }
  await updateCategoryBudget(category, plannedAmount, req.user!.id);
  res.json({ ok: true });
});

budgetsRouter.post("/expenses", requirePermission("spending.write"), async (req, res) => {
  const { category, projectId, description, amount, spentOn, partnerId, dueDate } = req.body ?? {};

  if (
    typeof category !== "string" ||
    !isExpenseCategory(category) ||
    typeof description !== "string" ||
    !description.trim() ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !isIsoDate(spentOn)
  ) {
    res.status(400).json({
      error: "category, description, and a positive amount are required, and spentOn must be a valid date",
    });
    return;
  }

  const isProjectCost = category === "project_costs";
  if (isProjectCost && (typeof projectId !== "string" || !projectId.trim())) {
    res.status(400).json({ error: "projectId is required for project costs" });
    return;
  }
  if (!isProjectCost && projectId != null && projectId !== "") {
    res.status(400).json({ error: "projectId is only allowed for project costs" });
    return;
  }

  // dueDate present => vendor bill (Dr Expense / Cr Accounts Payable); absent => cash expense (Dr Expense / Cr Bank).
  let normalizedDueDate: string | null = null;
  if (dueDate != null && dueDate !== "") {
    if (!isIsoDate(dueDate) || dueDate < spentOn) {
      res.status(400).json({ error: "dueDate must be a valid date on or after spentOn" });
      return;
    }
    if (typeof partnerId !== "string" || !partnerId.trim()) {
      res.status(400).json({ error: "partnerId (the vendor) is required when dueDate is set" });
      return;
    }
    normalizedDueDate = dueDate;
  } else if (partnerId != null && partnerId !== "") {
    res.status(400).json({ error: "partnerId is only allowed alongside dueDate (a vendor bill)" });
    return;
  }

  try {
    const { id } = await createExpense(
      {
        category,
        projectId: isProjectCost ? projectId : null,
        description: description.trim(),
        amount,
        spentOn,
        partnerId: normalizedDueDate ? partnerId : null,
        dueDate: normalizedDueDate,
      },
      req.user!.id,
    );
    res.status(201).json({ id });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to create expense" });
  }
});

budgetsRouter.patch("/expenses/:id/void", requirePermission("spending.write"), async (req, res) => {
  const expenseId = req.params.id;
  if (typeof expenseId !== "string") {
    res.status(400).json({ error: "Invalid expense id" });
    return;
  }
  try {
    await voidExpense(expenseId, req.user!.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to void expense" });
  }
});

