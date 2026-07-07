import { Router } from "express";
import { requirePermission } from "../middleware/auth.js";
import { updateRevenueTarget } from "../lib/mutations.js";
import { fetchInvoices, fetchRevenueTargets } from "../lib/queries.js";
import { getToday, monthStart } from "../lib/time.js";

export const trendsRouter = Router();

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

trendsRouter.get("/", async (_req, res) => {
  const today = getToday();
  const year = String(today.getUTCFullYear());
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

  const yearTargets = targetRows.filter((t) => t.period.startsWith(year));

  // The chart's months are the months leadership set a target for, in the current year.
  const monthlyRevenue = yearTargets.map((t) => {
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

  const revenueThisYear = [...revenueByMonth.entries()]
    .filter(([key]) => key.startsWith(year))
    .reduce((s, [, amount]) => s + amount, 0);
  const yearTarget = yearTargets.reduce((s, t) => s + t.target_amount, 0);
  const totalRevenue = revenueByClientType.reduce((s, c) => s + c.amount, 0);
  const government = revenueByClientType[0]?.amount ?? 0;

  const currentPeriod = monthStart(today);

  res.json({
    monthlyRevenue,
    revenueByProductLine,
    revenueByClientType,
    revenueThisYear,
    yearTargetPct: yearTarget === 0 ? 0 : Math.round((revenueThisYear / yearTarget) * 100),
    governmentSharePct:
      totalRevenue === 0 ? 0 : Math.round((government / totalRevenue) * 100),
    topProductLine: revenueByProductLine[0]?.productLine ?? "",
    currentPeriod,
    currentTarget: targetRows.find((t) => t.period === currentPeriod)?.target_amount ?? 0,
  });
});

trendsRouter.patch("/targets/:period", requirePermission("targets.edit"), async (req, res) => {
  const { period } = req.params;
  const { targetAmount } = req.body ?? {};
  if (typeof period !== "string" || !/^\d{4}-\d{2}-01$/.test(period)) {
    res.status(400).json({ error: "period must be YYYY-MM-01" });
    return;
  }
  if (typeof targetAmount !== "number" || !Number.isFinite(targetAmount) || targetAmount < 0) {
    res.status(400).json({ error: "targetAmount must be a non-negative number" });
    return;
  }
  await updateRevenueTarget(period, targetAmount, req.user!.id);
  res.json({ ok: true });
});
