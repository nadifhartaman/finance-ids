import InvoiceSummaryCards from "@/components/invoices/InvoiceSummaryCards";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import { getCurrentUser } from "@/lib/auth-mock";
import { getInvoices } from "@/lib/api";
import { can } from "@/lib/roles";

export default async function InvoicesPage() {
  const { invoices, summary } = await getInvoices();
  const user = await getCurrentUser();
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
          canWrite={can(user.role, "invoices.write")}
        />
      </div>
    </>
  );
}
