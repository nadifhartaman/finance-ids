import { Router } from "express";
import { spentByProject } from "../lib/aggregate.js";
import { budgetHealth } from "../lib/derive.js";
import { requirePermission } from "../middleware/auth.js";
import { isExpenseCategory, updateCategoryBudget } from "../lib/mutations.js";
import { fetchCategoryBudgets, fetchExpenses, fetchProjects } from "../lib/queries.js";
import { getToday, isSameMonth, monthStart } from "../lib/time.js";
import { formatRupiah, periodLabel } from "../lib/format.js";

export const budgetsRouter = Router();

const CATEGORY_LABELS = {
  payroll: "Payroll",
  operations: "Operations",
  project_costs: "Project costs",
} as const;

budgetsRouter.get("/", async (_req, res) => {
  const today = getToday();
  const period = monthStart(today);

  const [budgetRows, expenseRows, projectRows] = await Promise.all([
    fetchCategoryBudgets(period),
    fetchExpenses(),
    fetchProjects(),
  ]);

  const monthExpenses = expenseRows.filter((e) => isSameMonth(e.spent_on, today));

  const categoryBudgets = budgetRows.map((b) => {
    const spent = monthExpenses
      .filter((e) => e.category === b.category)
      .reduce((s, e) => s + e.amount, 0);
    return {
      id: `cat-${b.category}`,
      name: CATEGORY_LABELS[b.category],
      budget: b.planned_amount,
      spent,
      health: budgetHealth(b.planned_amount, spent),
    };
  });

  // Project budgets compare against CUMULATIVE spend (a project budget caps
  // the whole project, not one month) — same rule as the mock.
  const allTimeSpent = spentByProject(expenseRows);
  const projectBudgets = projectRows
    .filter((p) => p.budget !== null)
    .map((p) => {
      const spent = allTimeSpent.get(p.id) ?? 0;
      return {
        id: p.id,
        name: p.name,
        subtitle: p.client.name,
        budget: p.budget as number,
        spent,
        health: budgetHealth(p.budget as number, spent),
      };
    });

  // Monthly-only: project budgets are lifetime caps on the same
  // project_costs expenses already summed in categoryBudgets, so adding
  // them here would double-count that money. See projectTotals below for
  // the project-budgets summary instead.
  const totalBudget = categoryBudgets.reduce((s, b) => s + b.budget, 0);
  const totalSpent = categoryBudgets.reduce((s, b) => s + b.spent, 0);

  const projectTotals = {
    budget: projectBudgets.reduce((s, b) => s + b.budget, 0),
    spent: projectBudgets.reduce((s, b) => s + b.spent, 0),
    count: projectBudgets.length,
    overCount: projectBudgets.filter((p) => p.health.kind === "over").length,
  };

  const budgetInsights: string[] = [];

  for (const b of categoryBudgets) {
    if (b.health.kind === "over") {
      const over = b.spent - b.budget;
      budgetInsights.push(
        `${b.name} spent ${formatRupiah(over)} more than planned this month.`
      );
    }
  }

  for (const p of projectBudgets) {
    if (p.health.kind === "over") {
      const pctOver = Math.round((p.spent / p.budget - 1) * 100);
      budgetInsights.push(
        `${p.name} is ${pctOver}% over its project budget — see Needs attention on the Dashboard.`
      );
    }
  }

  let mostHeadroomCat = null;
  let maxHeadroom = 0;
  for (const b of categoryBudgets) {
    const headroom = b.budget - b.spent;
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

  res.json({
    period: periodLabel(today),
    categoryBudgets,
    projectBudgets,
    totals: {
      budget: totalBudget,
      spent: totalSpent,
      remaining: totalBudget - totalSpent,
      pctUsed: totalBudget === 0 ? 0 : Math.round((totalSpent / totalBudget) * 100),
    },
    projectTotals,
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
