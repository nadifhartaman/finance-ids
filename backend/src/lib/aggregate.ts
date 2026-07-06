/** Small pure aggregations shared by several routes. */

import type { ExpenseRow, InvoiceRow } from "./queries.js";

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
