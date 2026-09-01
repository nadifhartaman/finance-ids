import Link from "next/link";
import { APP_ROUTES } from "@/lib/routes";

const REPORTS = [
  {
    href: APP_ROUTES.journal,
    title: "General journal",
    description: "Every posted transaction, debit and credit, in order.",
  },
  {
    href: APP_ROUTES.trialBalance,
    title: "Trial balance",
    description: "Net balance per account as of a given date.",
  },
  {
    href: APP_ROUTES.incomeStatement,
    title: "Income statement",
    description: "Revenue and expenses for a period, and the profit in between.",
  },
  {
    href: APP_ROUTES.balanceSheet,
    title: "Balance sheet",
    description: "What we own, what we owe, and what's left over, as of a given date.",
  },
  {
    href: APP_ROUTES.cashFlowStatement,
    title: "Cash flow statement",
    description: "Cash in, cash out, and the running balance over a period.",
  },
] as const;

export default function ReportsPage() {
  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-title">Accounting reports</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          The full accounting cycle, drawn from the ledger — for accounting staff, not the Director dashboard.
        </p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {REPORTS.map((report) => (
          <Link
            key={report.href}
            href={report.href}
            className="rounded-2xl border border-card-border bg-card p-5 shadow-xs transition-colors hover:border-primary-200 hover:bg-primary-50/40"
          >
            <h2 className="text-base font-semibold text-title">{report.title}</h2>
            <p className="mt-1 text-sm text-ink-secondary">{report.description}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
