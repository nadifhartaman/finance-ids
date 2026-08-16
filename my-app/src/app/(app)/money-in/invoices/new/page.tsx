import Link from "next/link";
import { notFound } from "next/navigation";
import InvoiceForm from "@/components/invoices/InvoiceForm";
import { getRequiredUser } from "@/lib/auth";
import { getProjects } from "@/lib/api";
import { can } from "@/lib/roles";
import { APP_ROUTES } from "@/lib/routes";

export default async function NewInvoicePage() {
  const user = await getRequiredUser();
  const canWrite = can(user.role, "invoices.write");
  if (!canWrite) notFound();

  const { projects } = await getProjects();

  return (
    <>
      <Link
        href={APP_ROUTES.receivables}
        className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-title"
      >
        ← Back to Money In
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-title">New invoice</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Save it as a draft, then post it when it&apos;s ready to go out.
        </p>
      </header>

      <div className="mt-6">
        <InvoiceForm
          projects={projects.map((p) => ({ id: p.id, name: p.name, client: p.client }))}
          canWrite={canWrite}
        />
      </div>
    </>
  );
}
