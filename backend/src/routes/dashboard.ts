import { Router } from "express";
import { computeProjects, spentByProject } from "../lib/aggregate.js";
import { invoiceStatus, outstanding } from "../lib/derive.js";
import { asOfLabel, formatRupiah, periodLabel } from "../lib/format.js";
import {
  fetchCashSnapshots,
  fetchCategoryBudgets,
  fetchExpenses,
  fetchInvoices,
  fetchProjects,
  fetchRevenueTargets,
} from "../lib/queries.js";
import { getToday, isSameMonth, monthStart, previousMonthStart } from "../lib/time.js";

export const dashboardRouter = Router();

type HealthStatus = "good" | "watch" | "action";

const CATEGORY_LABELS = {
  payroll: "Payroll",
  operations: "Operations",
  project_costs: "Project costs",
} as const;

/** Signed rupiah delta string, mock style: "+ Rp 400 jt vs last month". */
function deltaText(diff: number, vs: string): string {
  const sign = diff >= 0 ? "+" : "−";
  return `${sign} ${formatRupiah(Math.abs(diff))} vs ${vs}`;
}

dashboardRouter.get("/", async (_req, res) => {
  const today = getToday();
  const period = monthStart(today);
  const prevPeriod = previousMonthStart(today);

  const [invoiceRows, projectRows, expenseRows, budgetRows, targetRows, snapshots] =
    await Promise.all([
      fetchInvoices(),
      fetchProjects(),
      fetchExpenses(),
      fetchCategoryBudgets(period),
      fetchRevenueTargets(),
      fetchCashSnapshots(2),
    ]);

  // A draft invoice has no ledger entry yet — exclude it, same as a voided one.
  const live = invoiceRows.filter((i) => !i.voided_at && i.status === "posted");

  /* ── Headline: revenue this month vs target (accrual rule) ── */
  const revenueThisMonth = live
    .filter((i) => isSameMonth(i.issued_date, today))
    .reduce((s, i) => s + i.amount, 0);
  const target = targetRows.find((t) => t.period === period)?.target_amount ?? 0;
  const pctOfTarget = target === 0 ? 100 : Math.round((revenueThisMonth / target) * 100);
  const revenueStatus: HealthStatus =
    pctOfTarget >= 100 ? "good" : pctOfTarget >= 70 ? "watch" : "action";

  /* ── Headline: operating profit = revenue − expenses, delta vs last month ── */
  const expensesThisMonth = expenseRows
    .filter((e) => isSameMonth(e.spent_on, today))
    .reduce((s, e) => s + e.amount, 0);
  const profit = revenueThisMonth - expensesThisMonth;

  const prevRevenue = live
    .filter((i) => i.issued_date.slice(0, 7) === prevPeriod.slice(0, 7))
    .reduce((s, i) => s + i.amount, 0);
  const prevExpenses = expenseRows
    .filter((e) => e.spent_on.slice(0, 7) === prevPeriod.slice(0, 7))
    .reduce((s, e) => s + e.amount, 0);
  const prevProfit = prevRevenue - prevExpenses;

  /* ── Headline: cash on hand from the latest snapshot ── */
  const cash = snapshots[0]?.amount ?? 0;
  const prevCash = snapshots[1]?.amount;
  const runwayMonths =
    expensesThisMonth === 0 ? null : Math.round(cash / expensesThisMonth);
  const cashStatus: HealthStatus =
    runwayMonths === null || runwayMonths >= 6
      ? "good"
      : runwayMonths >= 3
        ? "watch"
        : "action";

  const headlineStats = [
    {
      id: "cash",
      label: "Cash on hand",
      value: cash,
      status: cashStatus,
      note:
        runwayMonths === null
          ? "No spending recorded this month yet."
          : `Enough to run the company for about ${runwayMonths} months at current spending.`,
      delta:
        prevCash === undefined
          ? undefined
          : {
              text: deltaText(cash - prevCash, "last month"),
              direction: cash >= prevCash ? "up" : "down",
              upIsGood: true,
            },
    },
    {
      id: "revenue",
      label: "Revenue this month",
      value: revenueThisMonth,
      status: revenueStatus,
      note:
        target === 0
          ? "No target set for this month."
          : `${pctOfTarget}% of this month's target (${formatRupiah(target)}).`,
      delta:
        target === 0
          ? undefined
          : {
              text: deltaText(revenueThisMonth - target, "target"),
              direction: revenueThisMonth >= target ? "up" : "down",
              upIsGood: true,
            },
    },
    {
      id: "profit",
      label: "Operating profit",
      value: profit,
      status: (profit > 0 ? "good" : "action") as HealthStatus,
      note:
        profit > 0
          ? "We earned more than we spent this month."
          : "We spent more than we earned this month.",
      delta: {
        text: deltaText(profit - prevProfit, "last month"),
        direction: profit >= prevProfit ? "up" : "down",
        upIsGood: true,
      },
    },
  ];

  /* ── Attention items, worst first ── */
  const attentionItems: {
    id: string;
    severity: "critical" | "warning";
    message: string;
    suggestedAction: string;
  }[] = [];

  // Rule 1 (critical): invoices >60 days overdue, grouped per client.
  const badlyOverdue = new Map<string, { count: number; total: number }>();
  for (const inv of live) {
    const status = invoiceStatus(
      {
        amount: inv.amount,
        amountPaid: inv.amount_paid,
        dueDate: inv.due_date,
        paidDate: inv.paid_date,
        voidedAt: inv.voided_at,
        documentStatus: inv.status,
      },
      today,
    );
    if (status.kind === "overdue" && status.daysOverdue > 60) {
      const client = inv.project.client.name;
      const entry = badlyOverdue.get(client) ?? { count: 0, total: 0 };
      entry.count += 1;
      entry.total += inv.amount - inv.amount_paid;
      badlyOverdue.set(client, entry);
    }
  }
  for (const [client, { count, total }] of badlyOverdue) {
    attentionItems.push({
      id: `overdue-${client}`,
      severity: "critical",
      message: `${count} invoice${count > 1 ? "s" : ""} from ${client} ${count > 1 ? "are" : "is"} more than 60 days overdue — ${formatRupiah(total)} in total.`,
      suggestedAction: `Follow up with the finance contact at ${client} this week.`,
    });
  }

  // Rule 2 (warning): projects over their budget.
  const allTimeSpent = spentByProject(expenseRows);
  for (const p of projectRows) {
    if (p.budget === null) continue;
    const spent = allTimeSpent.get(p.id) ?? 0;
    if (spent > p.budget) {
      const pctOver = Math.round((spent / p.budget - 1) * 100);
      attentionItems.push({
        id: `project-${p.id}`,
        severity: "warning",
        message: `The ${p.name} project has spent ${pctOver}% more than its budget.`,
        suggestedAction: "Review project costs with the project lead.",
      });
    }
  }

  // Rule 3 (warning): categories spending over this month's plan.
  for (const b of budgetRows) {
    const spent = expenseRows
      .filter((e) => e.category === b.category && isSameMonth(e.spent_on, today))
      .reduce((s, e) => s + e.amount, 0);
    if (spent > b.planned_amount) {
      const pctOver = Math.round((spent / b.planned_amount - 1) * 100);
      attentionItems.push({
        id: `budget-${b.category}`,
        severity: "warning",
        message: `${CATEGORY_LABELS[b.category]} spending this month is ${pctOver}% above plan.`,
        suggestedAction: `Check the ${CATEGORY_LABELS[b.category].toLowerCase()} category before approving new spending.`,
      });
    }
  }

  attentionItems.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1,
  );

  /* ── Top unpaid invoices for the "Money owed to us" card ── */
  const allUnpaidInvoices = live
    .map((inv) => {
      const facts = {
        amount: inv.amount,
        amountPaid: inv.amount_paid,
        dueDate: inv.due_date,
        paidDate: inv.paid_date,
        voidedAt: inv.voided_at,
        documentStatus: inv.status,
      };
      return { inv, status: invoiceStatus(facts, today), outstanding: outstanding(facts) };
    })
    .filter(({ status }) => status.kind !== "paid")
    .sort((a, b) => b.outstanding - a.outstanding);

  const totalUnpaid = allUnpaidInvoices.reduce((s, { outstanding }) => s + outstanding, 0);

  const unpaidInvoices = allUnpaidInvoices
    .map(({ inv, status, outstanding }) => ({
      id: inv.id,
      number: inv.invoice_number,
      client: inv.project.client.name,
      project: inv.project.name,
      amount: inv.amount,
      outstanding,
      dueDate: inv.due_date,
      status,
    }));

  const projectStats = computeProjects(projectRows, invoiceRows, expenseRows).stats;

  res.json({
    asOf: asOfLabel(today),
    period: periodLabel(today),
    headlineStats,
    attentionItems,
    totalUnpaid,
    unpaidInvoices,
    projectStats,
  });
});
