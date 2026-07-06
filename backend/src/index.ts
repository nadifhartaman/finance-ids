import cors from "cors";
import express from "express";
import { env } from "./lib/env.js";
import { supabase } from "./lib/supabase.js";
import { errorHandler } from "./middleware/error.js";
import { budgetsRouter } from "./routes/budgets.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { invoicesRouter } from "./routes/invoices.js";
import { projectsRouter } from "./routes/projects.js";
import { trendsRouter } from "./routes/trends.js";

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

app.use("/api/dashboard", dashboardRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/budgets", budgetsRouter);
app.use("/api/trends", trendsRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`finance-ids backend listening on http://localhost:${env.PORT}`);
});
