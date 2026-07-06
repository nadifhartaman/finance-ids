/**
 * Roles & permissions — the access-control contract for the whole app.
 *
 * ⚠️ Kept in sync by hand with my-app/src/lib/roles.ts (no shared package
 * between the two npm roots). If you change the map here, change it there
 * too — this file is what the API actually enforces; the frontend copy only
 * decides what to show/hide.
 */

export type Role = "superadmin" | "admin" | "director" | "member";

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
