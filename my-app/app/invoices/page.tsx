import PageStub from "@/app/components/dashboard/PageStub";

export default function InvoicesPage() {
  return (
    <PageStub
      title="Invoices"
      subtitle="Unpaid invoices — who owes us and for how long."
      planned="A filterable table of every invoice with Paid / Awaiting / Overdue status, plus CSV and PDF export."
    />
  );
}
