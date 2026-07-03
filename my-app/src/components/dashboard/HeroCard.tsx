import { WalletIcon } from "@/components/shell/icons";
import type { HeadlineStat } from "@/lib/mock-data";
import { formatRupiah } from "@/lib/mock-data";

const STATUS_LABEL: Record<HeadlineStat["status"], string> = {
  good: "Healthy",
  watch: "Keep an eye on this",
  action: "Needs action",
};

/**
 * The one saturated surface per view (Fundex "Total balance" treatment) —
 * purple gradient, white text. Used for Cash on hand.
 */
export default function HeroCard({ stat }: { stat: HeadlineStat }) {
  return (
    <article className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 p-5 text-white shadow-md">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-white/15">
          <WalletIcon className="size-5" />
        </span>
        <h3 className="text-sm font-medium text-white/80">{stat.label}</h3>
      </div>
      <p className="mt-4 text-4xl font-semibold tracking-tight">
        {formatRupiah(stat.value)}
      </p>
      {stat.delta && (
        <p className="mt-1.5 text-sm font-medium text-white/90">
          {stat.delta.direction === "up" ? "▲" : "▼"} {stat.delta.text}
        </p>
      )}
      <div className="mt-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
          <span aria-hidden className="size-1.5 rounded-full bg-white" />
          {STATUS_LABEL[stat.status]}
        </span>
      </div>
      <p className="mt-2 text-sm text-white/75">{stat.note}</p>
    </article>
  );
}
