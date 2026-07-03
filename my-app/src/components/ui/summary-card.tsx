import type { ComponentType, SVGProps } from "react";

export interface SummaryCardProps {
  label: string;
  value: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Tinted icon-square classes, e.g. "bg-primary-50 text-primary-500" */
  iconClasses: string;
}

/** Fundex-style summary tile: tinted icon square, gray label, big value. */
export function SummaryCard({ label, value, Icon, iconClasses }: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-9 items-center justify-center rounded-lg ${iconClasses}`}
        >
          <Icon className="size-5" />
        </span>
        <h3 className="text-sm font-medium text-ink-secondary">{label}</h3>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-title">
        {value}
      </p>
    </article>
  );
}
