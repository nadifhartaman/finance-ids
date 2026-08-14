"use client";

/**
 * (app)/error.tsx does NOT catch errors thrown by (app)/layout.tsx — a
 * layout's error propagates to its parent segment's boundary, and there was
 * none above it until this file. getCurrentUser() now throws (rather than
 * silently returning null) when the backend is unreachable, so this is what
 * renders instead of an infinite redirect loop or a blank crash.
 */
export default function RootErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-4 p-8 text-center text-title">
      <h2 className="text-xl font-semibold">Can&apos;t reach the data service.</h2>
      <p className="max-w-md text-sm text-ink-secondary">
        The backend didn&apos;t respond. Check that it&apos;s running, then try again.
      </p>
      <button
        onClick={() => reset()}
        className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
      >
        Try again
      </button>
    </div>
  );
}
