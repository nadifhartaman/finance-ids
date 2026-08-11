import cors from "cors";
import express from "express";
import { env } from "./lib/env.js";
import { supabase } from "./lib/supabase.js";
import { errorHandler } from "./middleware/error.js";
import { requireAuth, requirePermission } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { meRouter } from "./routes/me.js";
import { usersRouter } from "./routes/users.js";
import { notesRouter } from "./routes/notes.js";
import { budgetsRouter } from "./routes/budgets.js";
import { clientsRouter } from "./routes/clients.js";
import { partnersRouter } from "./routes/partners.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { invoicesRouter } from "./routes/invoices.js";
import { projectsRouter } from "./routes/projects.js";
import { trendsRouter } from "./routes/trends.js";
import { accountingRouter } from "./routes/accounting.js";

const app = express();

app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Proves env + the shared Supabase client + RLS-bypass all work end to end.
app.get("/api/health/db", async (_req, res) => {
  const { count, error } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  res.json({ status: "ok", clients: count });
});

app.use("/api/auth", authRouter);
app.use("/api/me", requireAuth, meRouter);
app.use("/api/users", requireAuth, requirePermission("users.manage"), usersRouter);
app.use("/api/notes", requireAuth, notesRouter);

app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/invoices", requireAuth, invoicesRouter);
app.use("/api/projects", requireAuth, projectsRouter);
app.use("/api/clients", requireAuth, clientsRouter);
app.use("/api/partners", requireAuth, partnersRouter);
app.use("/api/budgets", requireAuth, budgetsRouter);
app.use("/api/trends", requireAuth, trendsRouter);
app.use("/api/accounting", requireAuth, accountingRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`finance-ids backend listening on http://localhost:${env.PORT}`);
});
