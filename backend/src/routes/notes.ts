import { Router } from "express";
import { requirePermission } from "../middleware/auth.js";
import { createPageNote } from "../lib/mutations.js";
import { fetchPageNotes } from "../lib/queries.js";

export const notesRouter = Router();

// Dashboard-only notes (see .scratch/user-management/PRD.md § Audit trail
// example) — reads are open to every authenticated role, writes need notes.write.
notesRouter.get("/", async (_req, res) => {
  res.json({ notes: await fetchPageNotes() });
});

notesRouter.post("/", requirePermission("notes.write"), async (req, res) => {
  const { body } = req.body ?? {};
  if (typeof body !== "string" || !body.trim()) {
    res.status(400).json({ error: "Note body is required" });
    return;
  }
  const { id } = await createPageNote(body.trim(), req.user!.id);
  res.status(201).json({ id });
});
