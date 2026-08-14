"use client";

import { Component, type ReactNode } from "react";
import { useRouter } from "next/navigation";

function RetryButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
    >
      Try again
    </button>
  );
}

/**
 * Next signals redirect() and notFound() by *throwing*, tagging the error with
 * a `digest`. Catching those here swallowed the control flow: when a session
 * lapsed, api.ts's 401 handler called redirect("/login") and this boundary
 * rendered "Couldn't load this section" instead of sending the user to log in
 * — and "Try again" just repeated it, so the section never recovered.
 * Re-throw them and let Next's own boundary handle it.
 */
function isNextControlFlowError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  const { digest } = error as { digest?: unknown };
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"))
  );
}

/**
 * Wraps one Suspense-streamed section so a failed fetch only takes down that
 * section, not the whole page — the accounting page fires ~10 independent
 * requests, and one 500 shouldn't blank the other nine.
 */
export default class SectionBoundary extends Component<
  { title: string; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(error: unknown) {
    if (isNextControlFlowError(error)) throw error;
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
          <h2 className="text-lg font-semibold text-title">{this.props.title}</h2>
          <p className="mt-2 text-sm text-chip-error-text">Couldn&apos;t load this section.</p>
          <RetryButton />
        </div>
      );
    }
    return this.props.children;
  }
}
