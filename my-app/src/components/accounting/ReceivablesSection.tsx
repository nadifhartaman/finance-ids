import SectionCard from "@/components/ui/section-card";
import { getArAging } from "@/lib/api";
import { APP_ROUTES } from "@/lib/routes";
import AgingBreakdown from "./AgingBreakdown";

export default async function ReceivablesSection({ asOf }: { asOf: string }) {
  const { buckets, partners } = await getArAging(asOf);

  return (
    <SectionCard title="Receivables" question="Who owes us money, and how overdue is it?">
      <AgingBreakdown
        buckets={buckets}
        partners={partners}
        partnerLabel="Customer"
        href={APP_ROUTES.receivables}
        emptyLabel="No open invoices as of this date."
      />
    </SectionCard>
  );
}
