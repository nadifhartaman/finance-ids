import Link from "next/link";

/** Server-rendered pager for /reports/journal — plain links, no client JS needed since the page itself already reads `?page=` server-side. */
export default function JournalPager({
  page,
  limit,
  total,
  basePath,
  query,
}: {
  page: number;
  limit: number;
  total: number;
  basePath: string;
  /** Other query params (from/to/journalCode) to preserve across page links. */
  query: Record<string, string | undefined>;
}) {
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  function href(targetPage: number): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
    params.set("page", String(targetPage));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-secondary">
        {total === 0 ? "0 entries" : `Showing ${rangeStart}–${rangeEnd} of ${total} entries`}
      </p>
      <div className="flex items-center gap-1.5">
        <Link
          href={href(Math.max(1, page - 1))}
          aria-disabled={page === 1}
          className={`rounded-lg border border-card-border px-3 py-1.5 text-sm font-medium text-title ${page === 1 ? "pointer-events-none opacity-40" : ""}`}
        >
          Previous
        </Link>
        <span className="px-2 text-sm text-ink-secondary">
          Page {page} of {pageCount}
        </span>
        <Link
          href={href(Math.min(pageCount, page + 1))}
          aria-disabled={page === pageCount}
          className={`rounded-lg border border-card-border px-3 py-1.5 text-sm font-medium text-title ${page === pageCount ? "pointer-events-none opacity-40" : ""}`}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
