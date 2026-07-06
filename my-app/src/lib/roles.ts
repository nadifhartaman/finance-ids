/**
 * Roles & permissions — the access-control contract for the whole app.
 *
 * Roles map to people, actions map to UI affordances. The rule of thumb
 * (see .scratch/user-management/PRD.md): admins edit records of FACT
 * (invoices, actual spending); the director edits PLANS and JUDGMENTS
 * (budgets, targets, project flags, notes).
 *
 * This file survives the mock phase: when real auth lands, the backend
 * enforces this same map and the frontend keeps using `can()` for
 * showing/hiding affordances.
 */

export type Role = "superadmin" | "admin" | "director" | "member";

export interface AppUser {
  id: string;
  name: string;
  /** Plain-language label shown in the UI (no jargon rule). */
  title: string;
  role: Role;
}

export const roleLabels: Record<Role, string> = {
  superadmin: "Super admin",
  admin: "Finance admin",
  director: "Director",
  member: "Staff",
};

const validRoles: Role[] = ["superadmin", "admin", "director", "member"];

export function isRole(value: string | undefined): value is Role {
  return validRoles.includes(value as Role);
}

/** ⚠️ Mock-phase only: replaced by real accounts when auth lands. */
export const mockUsers: AppUser[] = [
  { id: "u-superadmin", name: "Raka", title: "IT / System owner", role: "superadmin" },
  { id: "u-admin", name: "Sari", title: "Finance team", role: "admin" },
  { id: "u-director", name: "Pak Budi", title: "Company leadership", role: "director" },
  { id: "u-member", name: "Andi", title: "Staff", role: "member" },
];

export type PermissionAction =
  | "invoices.write"
  | "spending.write"
  | "projects.write"
  | "projects.flag"
  | "budgets.edit"
  | "targets.edit"
  | "notes.write"
  | "users.manage";

const permissions: Record<PermissionAction, readonly Role[]> = {
  "invoices.write": ["superadmin", "admin"],
  "spending.write": ["superadmin", "admin"],
  "projects.write": ["superadmin", "admin"],
  "projects.flag": ["superadmin", "admin", "director"],
  "budgets.edit": ["superadmin", "admin", "director"],
  "targets.edit": ["superadmin", "admin", "director"],
  "notes.write": ["superadmin", "admin", "director"],
  "users.manage": ["superadmin"],
};

export function can(role: Role, action: PermissionAction): boolean {
  return permissions[action].includes(role);
}
