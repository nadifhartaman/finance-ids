/** Placeholder body for routes that are designed but not built yet. */
export default function PageStub({
  title,
  subtitle,
  planned,
}: {
  title: string;
  subtitle: string;
  planned: string;
}) {
  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-title">
          {title}
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p>
      </header>
      <section className="mt-6 rounded-2xl border border-dashed border-card-border bg-card p-12 text-center">
        <p className="text-sm font-medium text-title">
          This page hasn&rsquo;t been built yet.
        </p>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-secondary">
          Planned: {planned}
        </p>
      </section>
    </>
  );
}
