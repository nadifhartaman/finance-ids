import { ChartBarIcon, TrendingUpIcon, WalletIcon } from "@/app/components/shell/icons";
import { Chip, type ChipColor } from "@/app/components/ui/chip";
import type { HeadlineStat } from "@/app/lib/mock-data";
import { formatRupiah } from "@/app/lib/mock-data";

const STATUS: Record<HeadlineStat["status"], { color: ChipColor; label: string }> = {
  good: { color: "success", label: "Healthy" },
  watch: { color: "warning", label: "Keep an eye on this" },
  action: { color: "error", label: "Needs action" },
};

/* Fundex KPI-card icon: soft tinted rounded square, hue by what the money does */
const ICONS: Record<string, { Icon: typeof WalletIcon; classes: string }> = {
  cash: { Icon: WalletIcon, classes: "bg-primary-50 text-primary-500" },
  revenue: { Icon: TrendingUpIcon, classes: "bg-chip-success-bg text-chip-success-icon" },
  profit: { Icon: ChartBarIcon, classes: "bg-primary-50 text-primary-500" },
};

export default function StatCard({ stat }: { stat: HeadlineStat }) {
  const status = STATUS[stat.status];
  const icon = ICONS[stat.id] ?? ICONS.profit;
  const deltaIsGood =
    stat.delta && (stat.delta.direction === "up") === stat.delta.upIsGood;

  return (
    <article className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-10 items-center justify-center rounded-lg ${icon.classes}`}
        >
          <icon.Icon className="size-5" />
        </span>
        <h3 className="text-sm font-medium text-ink-secondary">{stat.label}</h3>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-title">
        {formatRupiah(stat.value)}
      </p>
      {stat.delta && (
        <p
          className={`mt-1.5 text-sm font-medium ${
            deltaIsGood ? "text-delta-up" : "text-delta-down"
          }`}
        >
          {stat.delta.direction === "up" ? "▲" : "▼"} {stat.delta.text}
        </p>
      )}
      <div className="mt-3">
        <Chip color={status.color}>{status.label}</Chip>
      </div>
      <p className="mt-2 text-sm text-ink-secondary">{stat.note}</p>
    </article>
  );
}
