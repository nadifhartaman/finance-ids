export default function BudgetInsights({ insights }: { insights: string[] }) {
  return (
    <section className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
      <h2 className="text-lg font-semibold text-title">Budget insights</h2>
      <ul className="mt-4 space-y-3">
        {insights.map((insight) => (
          <li key={insight} className="flex items-start gap-2.5 text-sm text-ink-secondary">
            <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-600" />
            {insight}
          </li>
        ))}
      </ul>
    </section>
  );
}
