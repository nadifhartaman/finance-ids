import { Router } from "express";
import { isRole } from "../lib/permissions.js";
import { createUser, fetchUsers, updateUserActive, updateUserRole } from "../lib/users.js";

export const usersRouter = Router();

// Mounted with requireAuth + requirePermission("users.manage") in index.ts —
// every route here assumes req.user is a superadmin already.

usersRouter.get("/", async (_req, res) => {
  res.json({ users: await fetchUsers() });
});

usersRouter.post("/", async (req, res) => {
  const { email, password, fullName, role } = req.body ?? {};
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof fullName !== "string" ||
    typeof role !== "string" ||
    !email ||
    !password ||
    !fullName ||
    !role
  ) {
    res.status(400).json({ error: "email, password, fullName, and role are all required" });
    return;
  }
  if (!isRole(role)) {
    res.status(400).json({ error: `Invalid role "${role}"` });
    return;
  }

  try {
    const user = await createUser({ email, password, fullName, role });
    res.status(201).json({ user });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to create account" });
  }
});

usersRouter.patch("/:id/role", async (req, res) => {
  const { role } = req.body ?? {};
  if (typeof role !== "string" || !isRole(role)) {
    res.status(400).json({ error: `Invalid role "${role}"` });
    return;
  }
  await updateUserRole(req.params.id, role);
  res.json({ ok: true });
});

usersRouter.patch("/:id/active", async (req, res) => {
  const { isActive } = req.body ?? {};
  if (typeof isActive !== "boolean") {
    res.status(400).json({ error: "isActive must be a boolean" });
    return;
  }
  // Guard against a superadmin locking themselves out with one click.
  if (req.params.id === req.user?.id && !isActive) {
    res.status(400).json({ error: "You can't deactivate your own account" });
    return;
  }
  await updateUserActive(req.params.id, isActive);
  res.json({ ok: true });
});
