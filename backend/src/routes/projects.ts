import { Router } from "express";
import { computeProjects } from "../lib/aggregate.js";
import { requirePermission } from "../middleware/auth.js";
import {
  createProject,
  deleteProject,
  isClientType,
  isProductLine,
  updateProject,
  updateProjectBudget,
  updateProjectFlag,
} from "../lib/mutations.js";
import {
  fetchExpenses,
  fetchInvoices,
  fetchProjects,
  projectHasFinancialHistory,
} from "../lib/queries.js";

export const projectsRouter = Router();

projectsRouter.get("/", async (_req, res) => {
  const [projectRows, invoiceRows, expenseRows] = await Promise.all([
    fetchProjects(),
    fetchInvoices(),
    fetchExpenses(),
  ]);

  res.json(computeProjects(projectRows, invoiceRows, expenseRows));
});

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeNumberOrNull(value: unknown): value is number | null {
  return value === null || value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

projectsRouter.post("/", requirePermission("projects.write"), async (req, res) => {
  const { clientId, newClient, name, productLine, contractValue, budget } = req.body ?? {};

  const hasClientId = typeof clientId === "string" && clientId.trim().length > 0;
  const hasNewClient =
    newClient &&
    typeof newClient.name === "string" &&
    newClient.name.trim().length > 0 &&
    typeof newClient.clientType === "string" &&
    isClientType(newClient.clientType);

  if (hasClientId === hasNewClient) {
    res.status(400).json({ error: "Provide exactly one of clientId or newClient" });
    return;
  }
  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof productLine !== "string" ||
    !isProductLine(productLine) ||
    !isPositiveNumber(contractValue) ||
    !isNonNegativeNumberOrNull(budget)
  ) {
    res.status(400).json({
      error:
        "name and a valid productLine are required, contractValue must be positive, and budget (if given) must be non-negative",
    });
    return;
  }

  try {
    const { id } = await createProject(
      {
        clientId: hasClientId ? (clientId as string).trim() : undefined,
        newClient: hasNewClient
          ? { name: (newClient.name as string).trim(), clientType: newClient.clientType }
          : undefined,
        name: name.trim(),
        productLine,
        contractValue,
        budget: budget ?? null,
      },
      req.user!.id,
    );
    res.status(201).json({ id });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to create project" });
  }
});

projectsRouter.patch("/:id", requirePermission("projects.write"), async (req, res) => {
  const { id } = req.params;
  const { name, productLine, contractValue } = req.body ?? {};
  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    !name.trim() ||
    typeof productLine !== "string" ||
    !isProductLine(productLine) ||
    !isPositiveNumber(contractValue)
  ) {
    res.status(400).json({
      error: "name and a valid productLine are required, and contractValue must be positive",
    });
    return;
  }

  try {
    await updateProject(id, { name: name.trim(), productLine, contractValue }, req.user!.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update project" });
  }
});

projectsRouter.delete("/:id", requirePermission("projects.write"), async (req, res) => {
  const { id } = req.params;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  const hasHistory = await projectHasFinancialHistory(id);
  if (hasHistory) {
    res.status(400).json({
      error: "This project has invoices or spending recorded — it can't be deleted.",
    });
    return;
  }

  try {
    await deleteProject(id, req.user!.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to delete project" });
  }
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
