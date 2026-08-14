import Link from "next/link";
import { notFound } from "next/navigation";
import InvoiceForm from "@/components/invoices/InvoiceForm";
import { getRequiredUser } from "@/lib/auth";
import { getInvoice, getProjects } from "@/lib/api";
import { can } from "@/lib/roles";
import { APP_ROUTES } from "@/lib/routes";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getRequiredUser();
  const canWrite = can(user.role, "invoices.write");

  let invoice;
  try {
    invoice = await getInvoice(id);
  } catch {
    notFound();
  }

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
        <h1 className="text-2xl font-semibold tracking-tight text-title">{invoice.invoiceNumber}</h1>
        <p className="mt-1 text-sm text-ink-secondary">{invoice.projectName}</p>
      </header>

      <div className="mt-6">
        <InvoiceForm
          invoice={invoice}
          projects={projects.map((p) => ({ id: p.id, name: p.name, client: p.client }))}
          canWrite={canWrite}
        />
      </div>
    </>
  );
}
