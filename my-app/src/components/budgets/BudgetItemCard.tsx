import { Chip, type ChipColor } from "@/components/ui/chip";
import type { BudgetHealthKind, BudgetItem } from "@/lib/mock-data";
import { budgetHealth, formatRupiah } from "@/lib/mock-data";

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

export default function BudgetItemCard({ item }: { item: BudgetItem }) {
  const health = budgetHealth(item);
  const barWidth = Math.min(health.pctUsed, 100);

  return (
    <article className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-title">{item.name}</h3>
          {item.subtitle && (
            <p className="text-xs text-ink-muted">{item.subtitle}</p>
          )}
        </div>
        <Chip color={CHIP_COLOR[health.kind]}>{health.label}</Chip>
      </div>

      <p className="mt-3 text-sm text-ink-secondary">
        Budget {formatRupiah(item.budget)} · Spent {formatRupiah(item.spent)}
      </p>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-soft">
        <div
          className={`h-full rounded-full ${BAR_COLOR[health.kind]}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-ink-secondary">
        <span>{health.pctUsed}% used</span>
        <span className={health.kind === "over" ? "font-medium text-chip-error-text" : ""}>
          {health.kind === "over"
            ? `${formatRupiah(Math.abs(health.remaining))} over budget`
            : `${formatRupiah(health.remaining)} remaining`}
        </span>
      </div>
    </article>
  );
}
