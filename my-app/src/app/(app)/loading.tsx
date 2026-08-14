/**
 * Shown instantly on navigation while the target page's Server Component
 * awaits its data — without this, clicking a sidebar link left the old page
 * frozen on screen for the full round trip. Recessive skeleton tone, so it
 * never looks like real content.
 */
export default function AppLoading() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="h-7 w-48 rounded-md bg-skeleton" />
      <div className="mt-2 h-4 w-72 rounded-md bg-skeleton" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-skeleton" />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-64 rounded-2xl bg-skeleton" />
        ))}
      </div>
    </div>
  );
}
