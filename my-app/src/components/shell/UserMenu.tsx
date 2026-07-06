"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { setMockRole } from "@/lib/auth-mock-actions";
import { can, mockUsers, roleLabels, type AppUser } from "@/lib/roles";
import { CheckIcon, ChevronDownIcon, UsersIcon } from "./icons";
import ManageUsersDialog from "./ManageUsersDialog";

export default function UserMenu({ user }: { user: AppUser }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [manageOpen, setManageOpen] = useState(false);

  function switchTo(role: AppUser["role"]) {
    startTransition(async () => {
      await setMockRole(role);
      router.refresh();
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
      <DropdownMenuContent placement="bottom end" className="min-w-56">
        <DropdownMenuHeader>View as (preview — no login yet)</DropdownMenuHeader>
        {mockUsers.map((u) => (
          <DropdownMenuItem key={u.id} onAction={() => switchTo(u.role)}>
            <span className="flex size-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
              {u.name.charAt(0)}
            </span>
            <span className="flex-1">
              <span className="block font-medium text-title">{u.name}</span>
              <span className="block text-xs text-ink-muted">
                {roleLabels[u.role]} · {u.title}
              </span>
            </span>
            {u.role === user.role && (
              <CheckIcon className="size-4 text-primary-600" />
            )}
          </DropdownMenuItem>
        ))}
        {can(user.role, "users.manage") && (
          <>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem onAction={() => setManageOpen(true)}>
              <UsersIcon className="size-4 shrink-0 text-ink-muted" />
              <span className="font-medium text-title">Manage users</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
      <ManageUsersDialog isOpen={manageOpen} onOpenChange={setManageOpen} />
    </DropdownMenu>
  );
}
