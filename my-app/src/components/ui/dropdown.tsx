"use client";

import { cn } from "@/lib/cn";
import type { ComponentProps } from "react";
import {
  Button,
  type ButtonProps,
  Header,
  Menu,
  MenuItem,
  type MenuItemProps,
  MenuSection,
  MenuSectionProps,
  MenuTrigger,
  type MenuTriggerProps,
  Popover,
  type PopoverProps,
  Separator,
} from "react-aria-components";

export function DropdownMenu(props: MenuTriggerProps) {
  return <MenuTrigger {...props} />;
}

export function DropdownMenuTrigger({ className, ...props }: ButtonProps) {
  return <Button className={cn("outline-none", className)} {...props} />;
}

type DropdownContentProps = PopoverProps;

export function DropdownMenuContent({
  children,
  className,
  ...props
}: DropdownContentProps) {
  return (
    <Popover {...props}>
      <Menu
        className={cn(
          "outline-hidden min-w-40 overflow-clip rounded-xl border border-card-border bg-card p-1 shadow-md",
          className
        )}
      >
        {children}
      </Menu>
    </Popover>
  );
}

type DropdownMenuItemProps = MenuItemProps;

export function DropdownMenuItem({
  className,
  ...props
}: DropdownMenuItemProps) {
  return (
    <MenuItem
      {...props}
      className={cn(
        "group flex w-full cursor-default items-center gap-3 rounded-md px-2.5 py-1.5 text-sm text-ink-secondary outline-hidden focus:bg-soft focus:text-title",
        className
      )}
    />
  );
}

export function DropdownMenuSection<T extends object>({
  className,
  ...props
}: MenuSectionProps<T>) {
  return <MenuSection {...props} className={cn("", className)} />;
}

export function DropdownMenuHeader({
  className,
  ...props
}: ComponentProps<typeof Header>) {
  return (
    <Header
      {...props}
      className={cn("px-2.5 py-1.5 text-xs text-ink-muted", className)}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<"hr">) {
  return (
    <Separator
      className={cn("h-px border-none bg-card-border", className)}
      {...props}
    />
  );
}
