import { Router } from "express";
import { fetchInvoices, fetchRevenueTargets } from "../lib/queries.js";

export const trendsRouter = Router();

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

trendsRouter.get("/", async (_req, res) => {
  const [invoiceRows, targetRows] = await Promise.all([
    fetchInvoices(),
    fetchRevenueTargets(),
  ]);

  // Accrual rule (docs/erd.md): revenue = non-voided invoices by issue month.
  const live = invoiceRows.filter((i) => !i.voided_at);

  const revenueByMonth = new Map<string, number>();
  for (const inv of live) {
    const key = inv.issued_date.slice(0, 7); // YYYY-MM
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + inv.amount);
  }

  // The chart's months are the months leadership set a target for.
  const monthlyRevenue = targetRows.map((t) => {
    const key = t.period.slice(0, 7);
    const monthIndex = Number(key.slice(5, 7)) - 1;
    return {
      month: MONTH_LABELS[monthIndex] ?? key,
      revenue: revenueByMonth.get(key) ?? 0,
      target: t.target_amount,
    };
  });

  const byProductLine = new Map<string, number>();
  const byClientType = new Map<string, number>();
  for (const inv of live) {
    const line = inv.project.product_line;
    byProductLine.set(line, (byProductLine.get(line) ?? 0) + inv.amount);
    const type =
      inv.project.client.client_type === "government"
        ? "Government (B2G)"
        : "Private (B2B)";
    byClientType.set(type, (byClientType.get(type) ?? 0) + inv.amount);
  }

  const revenueByProductLine = [...byProductLine.entries()]
    .map(([productLine, amount]) => ({ productLine, amount }))
    .sort((a, b) => b.amount - a.amount);

  const revenueByClientType = ["Government (B2G)", "Private (B2B)"].map((type) => ({
    type,
    amount: byClientType.get(type) ?? 0,
  }));

  const revenueThisYear = monthlyRevenue.reduce((s, m) => s + m.revenue, 0);
  const yearTarget = monthlyRevenue.reduce((s, m) => s + m.target, 0);
  const totalRevenue = revenueByClientType.reduce((s, c) => s + c.amount, 0);
  const government = revenueByClientType[0]?.amount ?? 0;

  res.json({
    monthlyRevenue,
    revenueByProductLine,
    revenueByClientType,
    revenueThisYear,
    yearTargetPct: yearTarget === 0 ? 0 : Math.round((revenueThisYear / yearTarget) * 100),
    governmentSharePct:
      totalRevenue === 0 ? 0 : Math.round((government / totalRevenue) * 100),
    topProductLine: revenueByProductLine[0]?.productLine ?? "",
  });
});
