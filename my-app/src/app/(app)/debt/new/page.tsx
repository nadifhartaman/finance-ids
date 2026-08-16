import Link from "next/link";
import { notFound } from "next/navigation";
import LoanForm from "@/components/debt/LoanForm";
import { getRequiredUser } from "@/lib/auth";
import { getAccountingAccounts, getPartners } from "@/lib/api";
import { can } from "@/lib/roles";
import { APP_ROUTES } from "@/lib/routes";

export default async function NewLoanPage() {
  const user = await getRequiredUser();
  const canWrite = can(user.role, "accounting.post");
  if (!canWrite) notFound();

  const [{ partners }, { accounts }] = await Promise.all([
    getPartners("lender"),
    getAccountingAccounts(),
  ]);
  const liabilityAccounts = accounts.filter((a) => a.subtype === "loan");

  return (
    <>
      <Link
        href={APP_ROUTES.loans}
        className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-title"
      >
        ← Back to debt
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-title">New loan</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Record a new loan and post its disbursement to the ledger.
        </p>
      </header>

      <div className="mt-6">
        <LoanForm lenders={partners} liabilityAccounts={liabilityAccounts} />
      </div>
    </>
  );
}
