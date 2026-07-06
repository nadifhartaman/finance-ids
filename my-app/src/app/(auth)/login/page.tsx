"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/auth-actions";

const initialState: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-card-border bg-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-title">
          Indismart Financial Dashboard
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Sign in to see your company&apos;s financial health.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-title"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-title outline-none focus:border-primary-400"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-title"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-title outline-none focus:border-primary-400"
            />
          </div>

          {state.error && (
            <p className="rounded-lg bg-chip-error-bg px-3 py-2 text-sm text-chip-error-text">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
