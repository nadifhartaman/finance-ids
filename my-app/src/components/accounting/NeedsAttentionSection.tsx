import NeedsAttention from "@/components/dashboard/NeedsAttention";
import { getApAging, getArAging, getDebt, getProjectProfitability } from "@/lib/api";
import { formatRupiahExact } from "@/lib/format";
import type { AttentionItem } from "@/lib/types";

/**
 * Derived entirely from facts the other sections already fetch — overdue
 * A/R (31+ days), overdue A/P (31+ days), loans maturing within 30 days,
 * and projects with negative profit. No invented rules: anything that would
 * need data this app doesn't have (e.g. closed-period posting attempts) is
 * left out rather than guessed at.
 */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysFromNow(iso: string): number {
  return (new Date(`${iso}T00:00:00Z`).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
}

export default async function NeedsAttentionSection() {
  const today = todayIso();
  const [ar, ap, debt, profitability] = await Promise.all([
    getArAging(today),
    getApAging(today),
    getDebt("active"),
    getProjectProfitability(today, 50),
  ]);

  const items: AttentionItem[] = [];

  for (const p of ar.partners) {
    const overdue = p.d31_60 + p.d61_90 + p.d90plus;
    if (overdue <= 0) continue;
    items.push({
      id: `ar-${p.partnerId}`,
      severity: p.d90plus > 0 ? "critical" : "warning",
      message: `${p.partnerName} owes ${formatRupiahExact(overdue)} more than 30 days overdue`,
      suggestedAction: "Follow up on the outstanding invoices.",
    });
  }

  for (const p of ap.partners) {
    const overdue = p.d31_60 + p.d61_90 + p.d90plus;
    if (overdue <= 0) continue;
    items.push({
      id: `ap-${p.partnerId}`,
      severity: p.d90plus > 0 ? "critical" : "warning",
      message: `We owe ${p.partnerName} ${formatRupiahExact(overdue)} more than 30 days overdue`,
      suggestedAction: "Schedule payment to avoid further delay.",
    });
  }

  for (const loan of debt.loans) {
    if (!loan.maturityDate) continue;
    const days = daysFromNow(loan.maturityDate);
    if (days < 0 || days > 30) continue;
    items.push({
      id: `loan-${loan.loanId}`,
      severity: days <= 7 ? "critical" : "warning",
      message: `Loan ${loan.reference} with ${loan.lenderName} matures in ${Math.max(0, Math.round(days))} day(s)`,
      suggestedAction: "Confirm repayment plans with the lender.",
    });
  }

  for (const p of profitability.projects) {
    if (p.profit >= 0) continue;
    items.push({
      id: `project-${p.projectId}`,
      severity: "warning",
      message: `${p.projectName} is running at a loss of ${formatRupiahExact(Math.abs(p.profit))}`,
      suggestedAction: "Review project costs against the contract value.",
    });
  }

  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
        <h2 className="text-lg font-semibold text-title">Needs attention</h2>
        <p className="mt-0.5 text-sm text-ink-secondary">Things that may need a decision from you.</p>
        <p className="mt-4 text-sm text-ink-secondary">Nothing flagged right now.</p>
      </section>
    );
  }

  return <NeedsAttention items={items} />;
}
