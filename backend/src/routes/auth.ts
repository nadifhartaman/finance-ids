import { Router } from "express";
import { fetchProfileById } from "../lib/queries.js";
import { supabaseAuth } from "../lib/supabase.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const profile = await fetchProfileById(data.user.id);
  if (!profile) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (!profile.is_active) {
    res.status(403).json({ error: "This account has been deactivated" });
    return;
  }

  res.json({
    token: data.session.access_token,
    expiresAt: data.session.expires_at,
    user: { id: profile.id, name: profile.full_name, role: profile.role },
  });
});
