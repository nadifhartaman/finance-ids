import { Router } from "express";
import { billedByProject, spentByProject } from "../lib/aggregate.js";
import { PROJECT_HEALTH_ORDER, projectHealth } from "../lib/derive.js";
import { fetchExpenses, fetchInvoices, fetchProjects } from "../lib/queries.js";

export const projectsRouter = Router();

projectsRouter.get("/", async (_req, res) => {
  const [projectRows, invoiceRows, expenseRows] = await Promise.all([
    fetchProjects(),
    fetchInvoices(),
    fetchExpenses(),
  ]);

  const billed = billedByProject(invoiceRows);
  const spent = spentByProject(expenseRows);

  const projects = projectRows
    .map((p) => {
      const billedToDate = billed.get(p.id) ?? 0;
      const projectSpent = spent.get(p.id) ?? 0;
      return {
        id: p.id,
        name: p.name,
        client: p.client.name,
        productLine: p.product_line,
        contractValue: p.contract_value,
        billedToDate,
        budget: p.budget ?? undefined,
        spent: p.budget === null ? undefined : projectSpent,
        isFlagged: p.is_flagged,
        health: projectHealth(p.contract_value, billedToDate, p.budget, projectSpent),
      };
    })
    // Flagged-first ordering so the Director sees problems before healthy rows.
    .sort(
      (a, b) =>
        PROJECT_HEALTH_ORDER[a.health.kind] - PROJECT_HEALTH_ORDER[b.health.kind],
    );

  const overBudget = projects.filter((p) => p.health.kind === "over-budget");

  const stats = {
    active: projects.length,
    nearBilling: projects.filter((p) => p.health.kind === "near-billing").length,
    overBudget: overBudget.length,
    /** Signed but not yet billed. */
    pipelineValue: projects.reduce(
      (sum, p) => sum + (p.contractValue - p.billedToDate),
      0,
    ),
    flaggedProject: overBudget[0]?.name ?? "",
  };

  res.json({ projects, stats });
});
