/** Shared pager — same visual contract as InvoiceTable's original inline pager (purple active page, "Showing 1–8 of 23 …", disabled Previous/Next at the ends). */
export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  itemLabel,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}) {
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-secondary">
        {total === 0
          ? `0 ${itemLabel}`
          : `Showing ${rangeStart}–${rangeEnd} of ${total} ${itemLabel}`}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-lg border border-card-border px-3 py-1.5 text-sm font-medium text-title disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPageChange(n)}
            aria-current={n === page ? "page" : undefined}
            className={`size-8 rounded-lg text-sm font-medium ${
              n === page ? "bg-primary-600 text-white" : "text-title hover:bg-soft"
            }`}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page === pageCount}
          className="rounded-lg border border-card-border px-3 py-1.5 text-sm font-medium text-title disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
