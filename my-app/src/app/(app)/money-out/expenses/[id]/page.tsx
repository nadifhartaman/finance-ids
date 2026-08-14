import Link from "next/link";
import { notFound } from "next/navigation";
import ExpenseForm from "@/components/money-out/ExpenseForm";
import { getRequiredUser } from "@/lib/auth";
import { getAttachments, getAccountingAccounts, getExpense, getPartners, getProjects } from "@/lib/api";
import { can } from "@/lib/roles";
import { APP_ROUTES } from "@/lib/routes";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getRequiredUser();
  const canWrite = can(user.role, "spending.write");

  let expense;
  try {
    expense = await getExpense(id);
  } catch {
    notFound();
  }

  const [{ projects }, { partners }, { accounts }, { attachments }] = await Promise.all([
    getProjects(),
    getPartners("vendor"),
    getAccountingAccounts(),
    getAttachments("expense", id),
  ]);
  const bankAccounts = accounts.filter((a) => a.subtype === "bank" || a.subtype === "cash");

  return (
    <>
      <Link
        href={APP_ROUTES.expenses}
        className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-title"
      >
        ← Back to expenses
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-title">
          {expense.documentNumber ?? "Draft expense"}
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">{expense.description}</p>
      </header>

      <div className="mt-6">
        <ExpenseForm
          expense={expense}
          projects={projects.map((p) => ({ id: p.id, name: p.name, client: p.client }))}
          vendors={partners}
          bankAccounts={bankAccounts}
          attachments={attachments}
          canWrite={canWrite}
        />
      </div>
    </>
  );
}
