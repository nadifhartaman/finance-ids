"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  mockUsers,
  roleLabels,
  type Role,
} from "@/lib/roles";

const roleOptions: Role[] = ["superadmin", "admin", "director", "member"];

/**
 * Superadmin-only (`users.manage`). Role changes live in component state
 * (preview) — persisting them, inviting and deactivating users all arrive
 * with the backend. Lives in a dialog, not a page: adding a 6th route
 * needs an explicit product decision (root CLAUDE.md).
 */
export default function ManageUsersDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const [roles, setRoles] = useState<Record<string, Role>>(() =>
    Object.fromEntries(mockUsers.map((u) => [u.id, u.role]))
  );

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      {({ close }) => (
        <>
          <DialogHeader>
            <DialogTitle>Manage users</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <ul className="divide-y divide-card-border">
              {mockUsers.map((u) => (
                <li key={u.id} className="flex items-center gap-3 py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                    {u.name.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-title">
                      {u.name}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">
                      {u.title}
                    </span>
                  </span>
                  <select
                    value={roles[u.id]}
                    onChange={(e) =>
                      setRoles((prev) => ({
                        ...prev,
                        [u.id]: e.target.value as Role,
                      }))
                    }
                    aria-label={`Role for ${u.name}`}
                    className="rounded-lg border border-card-border bg-card px-2.5 py-1.5 text-sm font-medium text-title"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
            <p className="mt-2 rounded-lg bg-soft px-3 py-2 text-xs text-ink-secondary">
              Preview only — role changes are not saved yet. Inviting new
              people and saving roles arrive with the backend.
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
