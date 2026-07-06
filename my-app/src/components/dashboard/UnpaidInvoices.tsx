import { Chip } from "@/components/ui/chip";
import type { DashboardUnpaidInvoice } from "@/lib/types";
import { formatRupiah } from "@/lib/format";

export default function UnpaidInvoices({ invoices }: { invoices: DashboardUnpaidInvoice[] }) {
  return (
    <ul className="divide-y divide-card-border">
      {invoices.map((invoice) => {
        const status = invoice.status;
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
              {formatRupiah(invoice.outstanding)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
