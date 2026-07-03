import { cn } from "@/lib/cn";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

const tableRootStyles = cva(
  "min-w-full border-card-border border-separate border-spacing-0 overflow-clip text-left",
  {
    variants: {
      fullBleed: {
        true: "border-y",
        false: "rounded-lg border",
      },
    },
    defaultVariants: {
      fullBleed: false,
    },
  },
);

type TableRootProps = ComponentProps<"table"> &
  VariantProps<typeof tableRootStyles>;

export function TableRoot({ className, fullBleed, ...props }: TableRootProps) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn(tableRootStyles({ fullBleed }), className)}
        {...props}
      />
    </div>
  );
}

const tableHeaderStyles = cva(
  "[&_th]:border-card-border text-title [&_th]:border-b [&_th]:text-xs",
);

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn(tableHeaderStyles(), className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={className} {...props} />;
}

const tableHeadStyles = cva(
  "px-5 py-3.5 font-medium uppercase tracking-wide text-ink-muted",
);

export function TableHead({ className, ...props }: ComponentProps<"th">) {
  return <th className={cn(tableHeadStyles(), className)} {...props} />;
}

const tableRowStyles = cva(
  "not-last:[&>*]:border-card-border not-last:[&>td]:border-b not-last:[&>th]:border-b",
);

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn(tableRowStyles(), className)} {...props} />;
}

const tableCellStyles = cva("px-5 py-3.5 text-ink-secondary");

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn(tableCellStyles(), className)} {...props} />;
}
