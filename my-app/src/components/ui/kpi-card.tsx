import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { formatRupiahExact } from "@/lib/format";

export interface KpiCardProps {
  label: string;
  sublabel?: string;
  value: number;
  /** Omit entirely when there's nothing honest to compare against — never fabricate a comparison. */
  delta?: { text: string; direction: "up" | "down"; upIsGood: boolean };
  href?: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconClasses: string;
}

/** Denser KPI tile for the Accounting dashboard: exact figures (formatRupiahExact), optional delta, optional drill-down link. Unlike SummaryCard/StatCard, delta and link are both opt-in — an omitted delta renders nothing rather than a placeholder. */
export function KpiCard({ label, sublabel, value, delta, href, Icon, iconClasses }: KpiCardProps) {
  const deltaIsGood = delta && (delta.direction === "up") === delta.upIsGood;

  const body = (
    <>
      <div className="flex items-center gap-3">
        <span className={`flex size-9 items-center justify-center rounded-lg ${iconClasses}`}>
          <Icon className="size-5" />
        </span>
        <div>
          <h3 className="text-sm font-medium text-ink-secondary">{label}</h3>
          {sublabel && <p className="text-xs text-ink-muted">{sublabel}</p>}
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-title tabular-nums">
        {formatRupiahExact(value)}
      </p>
      {delta && (
        <p className={`mt-1 text-sm font-medium ${deltaIsGood ? "text-delta-up" : "text-delta-down"}`}>
          {delta.direction === "up" ? "▲" : "▼"} {delta.text}
        </p>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl border border-card-border bg-card p-4 shadow-xs transition-colors hover:border-primary-200"
      >
        {body}
      </Link>
    );
  }

  return <article className="rounded-2xl border border-card-border bg-card p-4 shadow-xs">{body}</article>;
}
