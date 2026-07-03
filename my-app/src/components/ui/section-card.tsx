import type { ReactNode } from "react";

/**
 * Card wrapper for one dashboard question. `question` is the plain-language
 * "so what should we do?" line every section must answer (root CLAUDE.md).
 * `action` renders top-right (e.g. a period chip), like Fundex card headers.
 */
export default function SectionCard({
  title,
  question,
  action,
  children,
  className = "",
}: {
  title: string;
  question: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-card-border bg-card p-5 shadow-xs ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-title">{title}</h2>
          <p className="mt-0.5 text-sm text-ink-secondary">{question}</p>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
