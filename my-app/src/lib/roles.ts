/**
 * Roles & permissions — the access-control contract for the whole app.
 *
 * Roles map to people, actions map to UI affordances. The rule of thumb
 * (see .scratch/user-management/PRD.md): admins edit records of FACT
 * (invoices, actual spending); the director edits PLANS and JUDGMENTS
 * (budgets, targets, project flags, notes).
 *
 * ⚠️ Kept in sync by hand with backend/src/lib/permissions.ts, which is what
 * the API actually enforces — this copy only decides what the UI shows/hides.
 */

export type Role = "superadmin" | "admin" | "director" | "member";

export interface AppUser {
  id: string;
  name: string;
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

export type PermissionAction =
  | "invoices.write"
  | "spending.write"
  | "projects.write"
  | "projects.flag"
  | "budgets.edit"
  | "targets.edit"
  | "notes.write"
  | "users.manage"
  | "accounting.reports.read"
  | "accounting.post"
  | "accounting.manual-entry"
  | "coa.manage";

const permissions: Record<PermissionAction, readonly Role[]> = {
  "invoices.write": ["superadmin", "admin"],
  "spending.write": ["superadmin", "admin"],
  "projects.write": ["superadmin", "admin"],
  "projects.flag": ["superadmin", "admin", "director"],
  "budgets.edit": ["superadmin", "admin", "director"],
  "targets.edit": ["superadmin", "admin", "director"],
  "notes.write": ["superadmin", "admin", "director"],
  "users.manage": ["superadmin"],
  "accounting.reports.read": ["superadmin", "admin", "director", "member"],
  "accounting.post": ["superadmin", "admin"],
  "accounting.manual-entry": ["superadmin", "admin"],
  "coa.manage": ["superadmin", "admin"],
};

export function can(role: Role, action: PermissionAction): boolean {
  return permissions[action].includes(role);
}
