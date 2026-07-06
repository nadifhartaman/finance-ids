import type { NextFunction, Request, RequestHandler, Response } from "express";
import { fetchProfileById } from "../lib/queries.js";
import { can, type PermissionAction, type Role } from "../lib/permissions.js";
import { supabaseAuth } from "../lib/supabase.js";

export interface AuthUser {
  id: string;
  fullName: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function bearerToken(req: Request): string | undefined {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice("Bearer ".length);
}

/** Verifies the bearer token against Supabase Auth and loads the profile row. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  const profile = await fetchProfileById(data.user.id);
  if (!profile) {
    res.status(401).json({ error: "No profile for this account" });
    return;
  }
  if (!profile.is_active) {
    res.status(403).json({ error: "This account has been deactivated" });
    return;
  }

  req.user = { id: profile.id, fullName: profile.full_name, role: profile.role };
  next();
}

/** Must run after requireAuth. Rejects unless req.user's role has the given permission. */
export function requirePermission(action: PermissionAction): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: "Missing bearer token" });
      return;
    }
    if (!can(req.user.role, action)) {
      res.status(403).json({ error: "You don't have permission to do this" });
      return;
    }
    next();
  };
}
