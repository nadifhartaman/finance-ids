/**
 * Central place for cross-page links so a route rename is a one-line edit,
 * not a hunt through JSX.
 */
export const APP_ROUTES = {
  receivables: "/money-in",
  payables: "/money-out",
  loans: "/debt",
  projects: "/projects",
  expenses: "/money-out/expenses",
  newExpense: "/money-out/expenses/new",
  newInvoice: "/money-in/invoices/new",
  newLoan: "/debt/new",
} as const satisfies Record<string, string>;

/** One dynamic drill-down, not three files — see my-app/CLAUDE.md's nested-route exception. */
export function expenseRoute(id: string): string {
  return `/money-out/expenses/${id}`;
}

/** Same nested-route exception as expenses — see my-app/CLAUDE.md. */
export function invoiceRoute(id: string): string {
  return `/money-in/invoices/${id}`;
}

export function expensesLaneRoute(category: "payroll" | "operations" | "project_costs"): string {
  return `/money-out/expenses?category=${category}`;
}
