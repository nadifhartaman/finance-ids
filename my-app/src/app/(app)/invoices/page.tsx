import InvoiceSummaryCards from "@/components/invoices/InvoiceSummaryCards";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import { getRequiredUser } from "@/lib/auth";
import { getInvoices, getProjects } from "@/lib/api";
import { can } from "@/lib/roles";

export default async function InvoicesPage() {
  const [user, { invoices, summary }, { projects: allProjects }] = await Promise.all([
    getRequiredUser(),
    getInvoices(),
    getProjects(),
  ]);
  const canWrite = can(user.role, "invoices.write");
  const projects = canWrite ? allProjects : [];

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-title">
          Invoices
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Unpaid invoices — who owes us and for how long.
        </p>
      </header>

      <div className="mt-6">
        <InvoiceSummaryCards summary={summary} />
      </div>

      <div className="mt-4">
        <InvoiceTable
          invoices={invoices}
          canWrite={canWrite}
          projects={projects.map((p) => ({ id: p.id, name: p.name, client: p.client }))}
        />
      </div>
    </>
  );
}
