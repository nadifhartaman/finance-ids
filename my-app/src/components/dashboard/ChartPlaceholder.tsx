/**
 * Deliberately recessive (one light violet tint, no data hues) so dummy shapes
 * are never mistaken for real data during layout review. Swap for real charts
 * (recharts) when data lands.
 */
const BAR_HEIGHTS = [45, 70, 55, 90, 62, 78, 50, 85];

export default function ChartPlaceholder({
  kind,
  caption,
}: {
  kind: "bars" | "line";
  caption: string;
}) {
  return (
    <figure>
      <div
        aria-hidden
        className="flex h-36 items-end gap-2 rounded-xl border border-dashed border-card-border px-4 pt-4"
      >
        {kind === "bars" ? (
          BAR_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className="w-full max-w-6 rounded-t-md bg-skeleton"
              style={{ height: `${h}%` }}
            />
          ))
        ) : (
          <svg
            viewBox="0 0 200 60"
            preserveAspectRatio="none"
            className="h-full w-full"
          >
            <polyline
              points="0,45 30,38 60,42 90,25 120,30 150,18 200,22"
              fill="none"
              stroke="var(--color-skeleton)"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
      <figcaption className="mt-2 text-xs text-ink-muted">
        {caption} · placeholder, real data coming later
      </figcaption>
    </figure>
  );
}
