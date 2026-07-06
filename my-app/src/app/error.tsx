"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4 p-8 text-center text-slate-800">
      <h2 className="text-xl font-semibold">We couldn't load the numbers.</h2>
      <p className="text-sm text-slate-600 max-w-md">
        Check that the data service is running and you have an active connection.
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
