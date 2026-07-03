import InvoiceSummaryCards from "@/components/invoices/InvoiceSummaryCards";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import { invoices } from "@/lib/mock-data";

export default function InvoicesPage() {
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
        <InvoiceSummaryCards />
      </div>

      <div className="mt-4">
        <InvoiceTable invoices={invoices} />
      </div>
    </>
  );
}
