import SectionCard from "@/components/ui/section-card";
import { getApAging } from "@/lib/api";
import AgingBreakdown from "./AgingBreakdown";

export default async function PayablesSection({ asOf }: { asOf: string }) {
  const { buckets, partners } = await getApAging(asOf);

  return (
    <SectionCard
      title="Unpaid bills"
      question="Which suppliers haven't been paid yet, and how late are we?"
    >
      <AgingBreakdown
        buckets={buckets}
        partners={partners}
        partnerLabel="Vendor"
        emptyLabel="No open vendor bills as of this date."
      />
    </SectionCard>
  );
}
