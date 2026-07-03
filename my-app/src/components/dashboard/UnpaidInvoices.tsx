import { Chip } from "@/components/ui/chip";
import type { UnpaidInvoice } from "@/lib/mock-data";
import { formatRupiah } from "@/lib/mock-data";

export default function UnpaidInvoices({
  invoices,
}: {
  invoices: UnpaidInvoice[];
}) {
  return (
    <ul className="divide-y divide-card-border">
      {invoices.map((invoice) => (
        <li
          key={invoice.id}
          className="flex items-center justify-between gap-4 py-3"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-sm font-medium text-title">{invoice.client}</p>
            {invoice.daysOverdue > 0 ? (
              <Chip color="error">Overdue by {invoice.daysOverdue} days</Chip>
            ) : (
              <Chip color="gray">Not yet due</Chip>
            )}
          </div>
          <p className="text-sm font-semibold text-title tabular-nums">
            {formatRupiah(invoice.amount)}
          </p>
        </li>
      ))}
    </ul>
  );
}
