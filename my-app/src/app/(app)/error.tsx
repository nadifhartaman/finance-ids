"use client";

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4 p-8 text-center text-title">
      <h2 className="text-xl font-semibold">We couldn&apos;t load the numbers.</h2>
      <p className="text-sm text-ink-secondary max-w-md">
        Check that the data service is running and you have an active connection.
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
