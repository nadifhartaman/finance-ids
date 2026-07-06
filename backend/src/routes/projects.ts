import { Router } from "express";
import { computeProjects } from "../lib/aggregate.js";
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
