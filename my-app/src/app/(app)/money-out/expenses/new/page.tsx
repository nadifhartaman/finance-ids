import Link from "next/link";
import { notFound } from "next/navigation";
import ExpenseForm from "@/components/money-out/ExpenseForm";
import { getRequiredUser } from "@/lib/auth";
import { getAccountingAccounts, getPartners, getProjects } from "@/lib/api";
import { can } from "@/lib/roles";
import { APP_ROUTES } from "@/lib/routes";

export default async function NewExpensePage() {
  const user = await getRequiredUser();
  const canWrite = can(user.role, "spending.write");
  if (!canWrite) notFound();

  const [{ projects }, { partners }, { accounts }] = await Promise.all([
    getProjects(),
    getPartners("vendor"),
    getAccountingAccounts(),
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
        <h1 className="text-2xl font-semibold tracking-tight text-title">New expense</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Save it as a draft, attach the nota, then post it when it&apos;s ready.
        </p>
      </header>

      <div className="mt-6">
        <ExpenseForm
          projects={projects.map((p) => ({ id: p.id, name: p.name, client: p.client }))}
          vendors={partners}
          bankAccounts={bankAccounts}
          attachments={[]}
          canWrite={canWrite}
        />
      </div>
    </>
  );
}
