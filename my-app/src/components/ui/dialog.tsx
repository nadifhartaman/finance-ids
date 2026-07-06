"use client";

import { cn } from "@/lib/cn";
import type { ComponentProps } from "react";
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  Modal as AriaModal,
  ModalOverlay,
  Heading,
  type DialogProps as AriaDialogProps,
  type HeadingProps,
} from "react-aria-components";

export interface DialogProps extends AriaDialogProps {
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  showCloseButton?: boolean;
}

export function Dialog({
  isOpen,
  defaultOpen,
  onOpenChange,
  className,
  showCloseButton = true,
  children,
  ...props
}: DialogProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="fixed inset-0 z-50 bg-gray-950/40"
    >
      <AriaModal>
        <AriaDialog
          className={cn(
            "fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-card-border bg-card p-6 shadow-md outline-none max-sm:max-w-[calc(100%-2rem)]",
            className
          )}
          {...props}
        >
          {({ close }) => (
            <>
              {typeof children === "function" ? children({ close }) : children}
              {showCloseButton && (
                <AriaButton
                  onPress={close}
                  aria-label="Close"
                  className="absolute top-4 right-4 flex size-7 items-center justify-center rounded-md text-ink-secondary opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    className="size-5"
                    aria-hidden
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                  <span className="sr-only">Close</span>
                </AriaButton>
              )}
            </>
          )}
        </AriaDialog>
      </AriaModal>
    </ModalOverlay>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-1.5 text-left", className)} {...props} />
  );
}

export interface DialogTitleProps extends HeadingProps {
  className?: string;
}

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <Heading
      slot="title"
      className={cn("text-lg leading-none font-semibold text-title", className)}
      {...props}
    />
  );
}

export function DialogBody({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("py-4 text-sm text-ink-secondary", className)} {...props} />
  );
}

export function DialogFooter({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
