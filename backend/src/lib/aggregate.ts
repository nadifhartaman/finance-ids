/** Small pure aggregations shared by several routes. */

import { PROJECT_HEALTH_ORDER, projectHealth } from "./derive.js";
import type { ExpenseRow, InvoiceRow, ProjectRow } from "./queries.js";

/** Σ invoice amount per project id, excluding voided (ERD accrual rule). */
export function billedByProject(invoices: InvoiceRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.voided_at) continue;
    map.set(inv.project.id, (map.get(inv.project.id) ?? 0) + inv.amount);
  }
  return map;
}

/** Σ expense amount per project id (project_costs rows only carry projects). */
export function spentByProject(expenses: ExpenseRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of expenses) {
    if (!e.project_id) continue;
    map.set(e.project_id, (map.get(e.project_id) ?? 0) + e.amount);
  }
  return map;
}

export function computeProjects(
  projectRows: ProjectRow[],
  invoiceRows: InvoiceRow[],
  expenseRows: ExpenseRow[]
) {
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
    .sort(
      (a, b) =>
        PROJECT_HEALTH_ORDER[a.health.kind] - PROJECT_HEALTH_ORDER[b.health.kind],
    );

  const overBudget = projects.filter((p) => p.health.kind === "over-budget");

  const stats = {
    active: projects.length,
    nearBilling: projects.filter((p) => p.health.kind === "near-billing").length,
    overBudget: overBudget.length,
    pipelineValue: projects.reduce(
      (sum, p) => sum + (p.contractValue - p.billedToDate),
      0,
    ),
    flaggedProject: overBudget[0]?.name ?? "",
  };

  return { projects, stats };
}
