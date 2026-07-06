"use server";

/**
 * Superadmin-only user management (Phase 2 of .scratch/user-management/PRD.md).
 * The backend re-checks requirePermission("users.manage") on every call —
 * these actions being reachable only from a superadmin-gated dialog is UX,
 * not the security boundary.
 */
import { revalidatePath } from "next/cache";
import { authedFetch } from "./authed-fetch";
import type { Role } from "./roles";
import type { UserListItem } from "./types";

export async function listUsers(): Promise<UserListItem[]> {
  const res = await authedFetch("/api/users");
  if (!res.ok) throw new Error("Failed to load users");
  const { users } = await res.json();
  return users;
}

export interface InviteState {
  error: string | null;
  success?: boolean;
}

export async function inviteUser(_prevState: InviteState, formData: FormData): Promise<InviteState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const fullName = formData.get("fullName");
  const role = formData.get("role");
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
    return { error: "All fields are required." };
  }

  const res = await authedFetch("/api/users", {
    method: "POST",
    body: JSON.stringify({ email, password, fullName, role }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.error ?? "Something went wrong. Please try again." };
  }

  revalidatePath("/");
  return { error: null, success: true };
}

export async function updateUserRole(id: string, role: Role): Promise<{ error: string | null }> {
  const res = await authedFetch(`/api/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.error ?? "Failed to update role." };
  }
  return { error: null };
}

export async function updateUserActive(
  id: string,
  isActive: boolean,
): Promise<{ error: string | null }> {
  const res = await authedFetch(`/api/users/${id}/active`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.error ?? "Failed to update account status." };
  }
  return { error: null };
}
