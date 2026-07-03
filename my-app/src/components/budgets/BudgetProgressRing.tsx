import {
  formatRupiah,
  pctBudgetUsed,
  totalRemaining,
  totalSpent,
} from "@/lib/mock-data";

const SIZE = 160;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Fundex donut, as a pure-SVG progress ring — no chart library needed. */
export default function BudgetProgressRing() {
  const isOver = pctBudgetUsed > 100;
  const fillFraction = Math.min(pctBudgetUsed, 100) / 100;
  const dashOffset = CIRCUMFERENCE * (1 - fillFraction);

  return (
    <section className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
      <h2 className="text-lg font-semibold text-title">This month&rsquo;s budget</h2>
      <p className="mt-0.5 text-sm text-ink-secondary">
        Are we spending more or less than planned?
      </p>

      <div className="mt-5 flex justify-center">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`${pctBudgetUsed}% of this month's budget used`}
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--color-soft)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={isOver ? "var(--color-chip-error-icon)" : "var(--color-primary-600)"}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-title text-2xl font-semibold"
          >
            {pctBudgetUsed}%
          </text>
        </svg>
      </div>

      <dl className="mt-5 space-y-3 border-t border-card-border pt-4">
        <div className="flex items-center justify-between text-sm">
          <dt className="flex items-center gap-2 text-ink-secondary">
            <span aria-hidden className="size-2 rounded-full bg-primary-600" />
            Spent
          </dt>
          <dd className="font-semibold text-title tabular-nums">
            {formatRupiah(totalSpent)}
          </dd>
        </div>
        <div className="flex items-center justify-between text-sm">
          <dt className="flex items-center gap-2 text-ink-secondary">
            <span aria-hidden className="size-2 rounded-full bg-soft" />
            Left to spend
          </dt>
          <dd className="font-semibold text-title tabular-nums">
            {formatRupiah(Math.max(totalRemaining, 0))}
          </dd>
        </div>
      </dl>
    </section>
  );
}
