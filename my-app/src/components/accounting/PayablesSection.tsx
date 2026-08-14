import SectionCard from "@/components/ui/section-card";
import { getApAging } from "@/lib/api";
import { APP_ROUTES } from "@/lib/routes";
import AgingBreakdown from "./AgingBreakdown";

export default async function PayablesSection({ asOf }: { asOf: string }) {
  const { buckets, partners } = await getApAging(asOf);

  return (
    <SectionCard title="Payables" question="Who do we owe money to, and how overdue is it?">
      <AgingBreakdown
        buckets={buckets}
        partners={partners}
        partnerLabel="Vendor"
        href={APP_ROUTES.payables}
        emptyLabel="No open vendor bills as of this date."
      />
    </SectionCard>
  );
}
