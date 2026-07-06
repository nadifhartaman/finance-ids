import { Router } from "express";
import { computeProjects } from "../lib/aggregate.js";
import { requirePermission } from "../middleware/auth.js";
import { updateProjectBudget, updateProjectFlag } from "../lib/mutations.js";
import { fetchExpenses, fetchInvoices, fetchProjects } from "../lib/queries.js";

export const projectsRouter = Router();

projectsRouter.get("/", async (_req, res) => {
  const [projectRows, invoiceRows, expenseRows] = await Promise.all([
    fetchProjects(),
    fetchInvoices(),
    fetchExpenses(),
  ]);

  res.json(computeProjects(projectRows, invoiceRows, expenseRows));
});

projectsRouter.patch("/:id/flag", requirePermission("projects.flag"), async (req, res) => {
  const { id } = req.params;
  const { isFlagged } = req.body ?? {};
  if (typeof id !== "string" || typeof isFlagged !== "boolean") {
    res.status(400).json({ error: "isFlagged must be a boolean" });
    return;
  }
  await updateProjectFlag(id, isFlagged, req.user!.id);
  res.json({ ok: true });
});

// Project budgets (the "planned amount" a project is allowed to spend) are
// governed by budgets.edit, same as category budgets — both are "what we
// plan to spend", per the PRD's fact-vs-plan split.
projectsRouter.patch("/:id/budget", requirePermission("budgets.edit"), async (req, res) => {
  const { id } = req.params;
  const { budget } = req.body ?? {};
  if (
    typeof id !== "string" ||
    typeof budget !== "number" ||
    !Number.isFinite(budget) ||
    budget < 0
  ) {
    res.status(400).json({ error: "budget must be a non-negative number" });
    return;
  }
  await updateProjectBudget(id, budget, req.user!.id);
  res.json({ ok: true });
});
