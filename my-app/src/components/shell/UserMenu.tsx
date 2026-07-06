"use client";

import { useState, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { logout } from "@/lib/auth-actions";
import { can, roleLabels, type AppUser } from "@/lib/roles";
import { ChevronDownIcon, LogOutIcon, UsersIcon } from "./icons";
import ManageUsersDialog from "./ManageUsersDialog";

export default function UserMenu({ user }: { user: AppUser }) {
  const [isPending, startTransition] = useTransition();
  const [manageOpen, setManageOpen] = useState(false);

  function signOut() {
    startTransition(async () => {
      await logout();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`flex items-center gap-2 rounded-lg py-1 pr-1 pl-1.5 hover:bg-soft ${
          isPending ? "opacity-60" : ""
        }`}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
          {user.name.charAt(0)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium text-title">
            {user.name}
          </span>
          <span className="block text-xs text-ink-muted">
            {roleLabels[user.role]}
          </span>
        </span>
        <ChevronDownIcon className="size-4 text-ink-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent placement="bottom end" className="min-w-48">
        {can(user.role, "users.manage") && (
          <>
            <DropdownMenuItem onAction={() => setManageOpen(true)}>
              <UsersIcon className="size-4 shrink-0 text-ink-muted" />
              <span className="font-medium text-title">Manage users</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
          </>
        )}
        <DropdownMenuItem onAction={signOut}>
          <LogOutIcon className="size-4 shrink-0 text-ink-muted" />
          <span className="font-medium text-title">Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
      {can(user.role, "users.manage") && (
        <ManageUsersDialog
          isOpen={manageOpen}
          onOpenChange={setManageOpen}
          currentUserId={user.id}
        />
      )}
    </DropdownMenu>
  );
}
