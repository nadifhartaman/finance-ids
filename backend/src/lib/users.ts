/**
 * User management (Phase 2 of .scratch/user-management/PRD.md) — reads and
 * writes for the `profiles` table plus the matching Supabase Auth account.
 * Kept separate from queries.ts: that file is read-only reporting data for
 * the 5 dashboard pages, this is account CRUD with a different shape and
 * blast radius (auth.admin.* calls, not just Postgres selects).
 */
import { supabase } from "./supabase.js";
import type { Role } from "./permissions.js";
import { invalidateProfileCache } from "../middleware/auth.js";

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

export async function fetchUsers(): Promise<UserListItem[]> {
  const [{ data: profiles, error: profilesError }, { data: authList, error: authError }] =
    await Promise.all([
      supabase.from("profiles").select("id, full_name, role, is_active").order("full_name"),
      supabase.auth.admin.listUsers(),
    ]);
  if (profilesError) throw profilesError;
  if (authError) throw authError;

  const emailById = new Map(authList.users.map((u) => [u.id, u.email ?? ""]));
  return profiles.map((p) => ({
    id: p.id,
    name: p.full_name,
    email: emailById.get(p.id) ?? "",
    role: p.role,
    isActive: p.is_active,
  }));
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}

/** Throws with a message safe to show the caller (no self-signup — a superadmin invites). */
export async function createUser(input: CreateUserInput): Promise<UserListItem> {
  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true, // skip email verification — required or login fails
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? "Failed to create account");
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    full_name: input.fullName,
    role: input.role,
  });
  if (profileError) {
    throw new Error(`Account created but profile setup failed: ${profileError.message}`);
  }

  return { id: data.user.id, name: input.fullName, email: input.email, role: input.role, isActive: true };
}

export async function updateUserRole(id: string, role: Role): Promise<void> {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw error;
  invalidateProfileCache(id);
}

export async function updateUserActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
  invalidateProfileCache(id);
}
