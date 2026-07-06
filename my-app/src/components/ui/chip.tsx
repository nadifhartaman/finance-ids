import type { ReactNode } from "react";

export type ChipColor = "success" | "warning" | "error" | "gray" | "primary";

const COLORS: Record<ChipColor, { pill: string; dot: string }> = {
  success: { pill: "bg-chip-success-bg text-chip-success-text", dot: "bg-chip-success-icon" },
  warning: { pill: "bg-chip-warning-bg text-chip-warning-text", dot: "bg-chip-warning-icon" },
  error: { pill: "bg-chip-error-bg text-chip-error-text", dot: "bg-chip-error-icon" },
  gray: { pill: "bg-chip-gray-bg text-chip-gray-text", dot: "bg-chip-gray-icon" },
  primary: { pill: "bg-chip-primary-bg text-chip-primary-text", dot: "bg-chip-primary-icon" },
};

/**
 * Fundex-style tinted status pill. The dot is decorative — the text label is
 * what carries meaning (status is never color alone).
 */
export function Chip({
  color,
  children,
  dot = true,
}: {
  color: ChipColor;
  children: ReactNode;
  dot?: boolean;
}) {
  const c = COLORS[color];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.pill}`}
    >
      {dot && <span aria-hidden className={`size-1.5 rounded-full ${c.dot}`} />}
      {children}
    </span>
  );
}
