import { Chip } from "@/components/ui/chip";
import type { Invoice } from "@/lib/mock-data";
import { formatRupiah, invoiceStatus } from "@/lib/mock-data";

export default function UnpaidInvoices({ invoices }: { invoices: Invoice[] }) {
  return (
    <ul className="divide-y divide-card-border">
      {invoices.map((invoice) => {
        const status = invoiceStatus(invoice);
        return (
          <li
            key={invoice.id}
            className="flex items-center justify-between gap-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-sm font-medium text-title">{invoice.client}</p>
              <Chip color={status.kind === "overdue" ? "error" : "gray"}>
                {status.label}
              </Chip>
            </div>
            <p className="text-sm font-semibold text-title tabular-nums">
              {formatRupiah(invoice.amount)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
