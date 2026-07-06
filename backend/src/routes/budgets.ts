import { Router } from "express";
import { spentByProject } from "../lib/aggregate.js";
import { budgetHealth } from "../lib/derive.js";
import { fetchCategoryBudgets, fetchExpenses, fetchProjects } from "../lib/queries.js";
import { getToday, isSameMonth, monthStart } from "../lib/time.js";

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

  const totalBudget = categoryBudgets.reduce((s, b) => s + b.budget, 0);
  const totalSpent = categoryBudgets.reduce((s, b) => s + b.spent, 0);

  res.json({
    period,
    categoryBudgets,
    projectBudgets,
    totals: {
      budget: totalBudget,
      spent: totalSpent,
      remaining: totalBudget - totalSpent,
      pctUsed: totalBudget === 0 ? 0 : Math.round((totalSpent / totalBudget) * 100),
    },
  });
});
