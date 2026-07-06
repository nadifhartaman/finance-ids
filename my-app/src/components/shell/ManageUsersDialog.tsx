"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  inviteUser,
  listUsers,
  updateUserActive,
  updateUserRole,
  type InviteState,
} from "@/lib/users-actions";
import { roleLabels, type Role } from "@/lib/roles";
import type { UserListItem } from "@/lib/types";

const roleOptions: Role[] = ["superadmin", "admin", "director", "member"];
const initialInviteState: InviteState = { error: null };

/**
 * Superadmin-only (`users.manage`). Backed by real endpoints (Phase 2 of
 * .scratch/user-management/PRD.md) — role changes, activation, and invites
 * all persist. Lives in a dialog, not a page: a /users route needs an
 * explicit product decision (root CLAUDE.md's 5-page rule).
 */
export default function ManageUsersDialog({
  isOpen,
  onOpenChange,
  currentUserId,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentUserId: string;
}) {
  const [users, setUsers] = useState<UserListItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [inviteState, inviteAction, isInviting] = useActionState(inviteUser, initialInviteState);

  useEffect(() => {
    if (!isOpen) return;
    startTransition(async () => {
      setLoadError(null);
      try {
        setUsers(await listUsers());
      } catch {
        setLoadError("Couldn't load users. Try again.");
      }
    });
  }, [isOpen, inviteState]);

  function changeRole(id: string, role: Role) {
    setUsers((prev) => prev?.map((u) => (u.id === id ? { ...u, role } : u)) ?? prev);
    startTransition(async () => {
      const { error } = await updateUserRole(id, role);
      if (error) setLoadError(error);
    });
  }

  function toggleActive(id: string, isActive: boolean) {
    setUsers((prev) => prev?.map((u) => (u.id === id ? { ...u, isActive } : u)) ?? prev);
    startTransition(async () => {
      const { error } = await updateUserActive(id, isActive);
      if (error) setLoadError(error);
    });
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} className="max-w-lg">
      {({ close }) => (
        <>
          <DialogHeader>
            <DialogTitle>Manage users</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {loadError && (
              <p className="mb-2 rounded-lg bg-chip-error-bg px-3 py-2 text-sm text-chip-error-text">
                {loadError}
              </p>
            )}

            <ul className="max-h-64 divide-y divide-card-border overflow-y-auto">
              {(users ?? []).map((u) => (
                <li key={u.id} className="flex items-center gap-3 py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                    {u.name.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-title">
                      {u.name}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">
                      {u.email}
                    </span>
                  </span>
                  <select
                    value={u.role}
                    disabled={isPending}
                    onChange={(e) => changeRole(u.id, e.target.value as Role)}
                    aria-label={`Role for ${u.name}`}
                    className="rounded-lg border border-card-border bg-card px-2.5 py-1.5 text-sm font-medium text-title disabled:opacity-60"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={isPending || u.id === currentUserId}
                    onClick={() => toggleActive(u.id, !u.isActive)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-40 ${
                      u.isActive
                        ? "border-card-border text-ink-secondary hover:bg-soft"
                        : "border-chip-error-icon bg-chip-error-bg text-chip-error-text"
                    }`}
                  >
                    {u.isActive ? "Active" : "Deactivated"}
                  </button>
                </li>
              ))}
              {users === null && !loadError && (
                <li className="py-3 text-sm text-ink-muted">Loading…</li>
              )}
            </ul>

            <form action={inviteAction} className="mt-4 space-y-2 border-t border-card-border pt-4">
              <p className="text-xs font-medium text-ink-secondary">Invite a new user</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  name="fullName"
                  placeholder="Full name"
                  required
                  className="rounded-lg border border-card-border bg-card px-2.5 py-1.5 text-sm text-title outline-none focus:border-primary-400"
                />
                <select
                  name="role"
                  defaultValue="member"
                  className="rounded-lg border border-card-border bg-card px-2.5 py-1.5 text-sm text-title"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  required
                  className="col-span-2 rounded-lg border border-card-border bg-card px-2.5 py-1.5 text-sm text-title outline-none focus:border-primary-400"
                />
                <input
                  name="password"
                  type="text"
                  placeholder="Temporary password"
                  required
                  className="col-span-2 rounded-lg border border-card-border bg-card px-2.5 py-1.5 text-sm text-title outline-none focus:border-primary-400"
                />
              </div>
              {inviteState.error && (
                <p className="rounded-lg bg-chip-error-bg px-3 py-2 text-xs text-chip-error-text">
                  {inviteState.error}
                </p>
              )}
              <button
                type="submit"
                disabled={isInviting}
                className="w-full rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {isInviting ? "Creating…" : "Create account"}
              </button>
            </form>

            <p className="mt-2 rounded-lg bg-soft px-3 py-2 text-xs text-ink-secondary">
              Send the temporary password to the person directly — there is no
              invite email yet.
            </p>
          </DialogBody>
          <DialogFooter>
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-soft"
            >
              Close
            </button>
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
}
