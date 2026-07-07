import type { NextFunction, Request, RequestHandler, Response } from "express";
import { fetchProfileById } from "../lib/queries.js";
import { can, type PermissionAction, type Role } from "../lib/permissions.js";
import { supabaseAuth } from "../lib/supabase.js";

// Matches the frontend's AppUser contract (my-app/src/lib/roles.ts) exactly —
// this is what both /api/auth/login and /api/me hand back to the client.
export interface AuthUser {
  id: string;
  name: string;
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

type Profile = Awaited<ReturnType<typeof fetchProfileById>>;

const PROFILE_CACHE_TTL_MS = 30_000;
const profileCache = new Map<string, { profile: Profile; expiresAt: number }>();

/**
 * Every authed request was paying a full Supabase round trip just to reload
 * a profile row that almost never changes between requests. A short TTL
 * cache cuts that hop for the common case; trade-off is a role/active-state
 * change can take up to 30s to take effect unless invalidateProfileCache is
 * called (see src/lib/users.ts's role/active writes).
 */
async function getCachedProfile(id: string): Promise<Profile> {
  const cached = profileCache.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.profile;

  const profile = await fetchProfileById(id);
  profileCache.set(id, { profile, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
  return profile;
}

export function invalidateProfileCache(id: string): void {
  profileCache.delete(id);
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

  const profile = await getCachedProfile(data.user.id);
  if (!profile) {
    res.status(401).json({ error: "No profile for this account" });
    return;
  }
  if (!profile.is_active) {
    res.status(403).json({ error: "This account has been deactivated" });
    return;
  }

  req.user = { id: profile.id, name: profile.full_name, role: profile.role };
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
