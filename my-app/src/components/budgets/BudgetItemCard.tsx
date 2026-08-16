import Link from "next/link";
import type { ReactNode } from "react";
import { Chip, type ChipColor } from "@/components/ui/chip";
import type { BudgetHealthKind, BudgetItem } from "@/lib/types";
import { formatRupiah } from "@/lib/format";

const CHIP_COLOR: Record<BudgetHealthKind, ChipColor> = {
  "on-track": "success",
  "near-limit": "warning",
  over: "error",
};

const BAR_COLOR: Record<BudgetHealthKind, string> = {
  "on-track": "bg-primary-600",
  "near-limit": "bg-chip-warning-icon",
  over: "bg-chip-error-icon",
};

export default function BudgetItemCard({
  item,
  onEdit,
  noPlanHint,
  href,
  linkLabel,
  footnote,
  compact,
}: {
  item: BudgetItem;
  /** Renders an "Edit budget" affordance; only passed for roles with `budgets.edit`. */
  onEdit?: () => void;
  /** Shown instead of a health chip when the item has no plan in this scope. */
  noPlanHint?: string;
  /** Drill-down link, rendered as its own row below the health bar — kept out of the card's own click target so it never nests inside the Edit button. */
  href?: string;
  linkLabel?: string;
  /** Extra line under the health bar, e.g. a "N drafts waiting" count. */
  footnote?: ReactNode;
  /** Tighter padding, no separate budget/spent line — used for display-only strips. */
  compact?: boolean;
}) {
  const health = item.health;

  return (
    <article
      className={`rounded-2xl border border-card-border bg-card shadow-xs ${compact ? "p-4" : "p-5"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-title">{item.name}</h3>
          {!compact && item.subtitle && (
            <p className="text-xs text-ink-muted">{item.subtitle}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-md px-2 py-0.5 text-xs font-medium text-primary-700 hover:bg-primary-50"
            >
              Edit budget
            </button>
          )}
          {health ? (
            <Chip color={CHIP_COLOR[health.kind]}>{health.label}</Chip>
          ) : (
            noPlanHint && (
              <span className="text-xs text-ink-muted">{noPlanHint}</span>
            )
          )}
        </div>
      </div>

      <p className="mt-3 text-sm text-ink-secondary">
        {item.budget !== null && <>Budget {formatRupiah(item.budget)} · </>}
        Spent {formatRupiah(item.spent)}
      </p>

      {health && (
        <>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-soft">
            <div
              className={`h-full rounded-full ${BAR_COLOR[health.kind]}`}
              style={{ width: `${Math.min(health.pctUsed, 100)}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-ink-secondary">
            <span>{health.pctUsed}% used</span>
            <span
              className={
                health.kind === "over" ? "font-medium text-chip-error-text" : ""
              }
            >
              {health.kind === "over"
                ? `${formatRupiah(Math.abs(health.remaining))} over budget`
                : `${formatRupiah(health.remaining)} remaining`}
            </span>
          </div>
        </>
      )}

      {footnote}

      {href && (
        <Link
          href={href}
          className="mt-3 block text-sm font-medium text-primary-700 hover:underline"
        >
          {linkLabel ?? "View transactions →"}
        </Link>
      )}
    </article>
  );
}
