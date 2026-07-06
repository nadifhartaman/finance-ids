import {
  BriefcaseIcon,
  ReceiptIcon,
  TrendingUpIcon,
  WalletIcon,
} from "@/components/shell/icons";
import { SummaryCard } from "@/components/ui/summary-card";
import { formatRupiah } from "@/lib/format";
import type { ProjectStats } from "@/lib/types";

export default function ProjectSummaryCards({ stats }: { stats: ProjectStats }) {
  const CARDS = [
    {
      label: "Active projects",
      value: String(stats.active),
      Icon: BriefcaseIcon,
      iconClasses: "bg-primary-50 text-primary-500",
    },
    {
      label: "Close to billing",
      value: String(stats.nearBilling),
      Icon: ReceiptIcon,
      iconClasses: "bg-chip-success-bg text-chip-success-icon",
    },
    {
      label: "Over budget",
      value: String(stats.overBudget),
      Icon: TrendingUpIcon,
      iconClasses: "bg-chip-error-bg text-chip-error-icon",
      note: stats.flaggedProject,
    },
    {
      label: "Pipeline value",
      value: formatRupiah(stats.pipelineValue),
      Icon: WalletIcon,
      iconClasses: "bg-primary-50 text-primary-500",
      note: "Signed but not yet billed",
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CARDS.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  );
}
