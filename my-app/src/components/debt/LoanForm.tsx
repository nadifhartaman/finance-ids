"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLoan } from "@/lib/loans-actions";
import { APP_ROUTES } from "@/lib/routes";
import type { AccountOption, LoanInput, PartnerOption } from "@/lib/types";

const fieldClass =
  "w-full rounded-lg border border-card-border bg-card px-3 py-2 text-title outline-none focus:border-primary-300 disabled:bg-soft disabled:text-ink-muted";
const labelClass = "mb-1.5 block text-sm font-medium text-title";

export default function LoanForm({
  lenders,
  liabilityAccounts,
}: {
  lenders: PartnerOption[];
  liabilityAccounts: AccountOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [reference, setReference] = useState("");
  const [lenderPartnerId, setLenderPartnerId] = useState("");
  const [liabilityAccountId, setLiabilityAccountId] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRatePct, setInterestRatePct] = useState("");
  const [startDate, setStartDate] = useState("");
  const [maturityDate, setMaturityDate] = useState("");

  function buildInput(): LoanInput {
    return {
      reference: reference.trim(),
      lenderPartnerId,
      liabilityAccountId,
      principalAmount: Number(principalAmount),
      interestRatePct: interestRatePct ? Number(interestRatePct) : null,
      startDate,
      maturityDate: maturityDate || null,
    };
  }

  function handleSubmit() {
    setError(null);
    const input = buildInput();
    if (!input.reference) {
      setError("A reference is required.");
      return;
    }
    if (!input.lenderPartnerId) {
      setError("Choose a lender.");
      return;
    }
    if (!input.liabilityAccountId) {
      setError("Choose a loan account.");
      return;
    }
    if (!input.principalAmount || input.principalAmount <= 0) {
      setError("Principal amount must be greater than zero.");
      return;
    }
    if (!input.startDate) {
      setError("A start date is required.");
      return;
    }

    startTransition(async () => {
      const result = await createLoan(input);
      if (result.error || !result.id) {
        setError(result.error ?? "Failed to create loan.");
        return;
      }
      router.push(APP_ROUTES.loans);
    });
  }

  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={labelClass}>Reference</span>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="BCA working capital loan"
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Lender</span>
          <select
            value={lenderPartnerId}
            onChange={(e) => setLenderPartnerId(e.target.value)}
            className={fieldClass}
          >
            <option value="">Choose a lender…</option>
            {lenders.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={labelClass}>Loan account</span>
          <select
            value={liabilityAccountId}
            onChange={(e) => setLiabilityAccountId(e.target.value)}
            className={fieldClass}
          >
            <option value="">Choose an account…</option>
            {liabilityAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={labelClass}>Principal</span>
          <span className="flex items-center gap-2 rounded-lg border border-card-border px-3 py-2 focus-within:border-primary-300">
            <span className="text-ink-muted">Rp</span>
            <input
              type="number"
              min={0}
              value={principalAmount}
              onChange={(e) => setPrincipalAmount(e.target.value)}
              className="w-full bg-transparent text-foreground outline-none"
            />
          </span>
        </label>

        <label className="block">
          <span className={labelClass}>Interest rate (% per year, optional)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={interestRatePct}
            onChange={(e) => setInterestRatePct(e.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Maturity date (optional)</span>
          <input
            type="date"
            value={maturityDate}
            onChange={(e) => setMaturityDate(e.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-chip-error-bg px-3 py-2 text-sm text-chip-error-text">{error}</p>
      )}

      <div className="mt-5 flex items-center gap-2 border-t border-card-border pt-4">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSubmit}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
        >
          Create loan
        </button>
      </div>
    </div>
  );
}
