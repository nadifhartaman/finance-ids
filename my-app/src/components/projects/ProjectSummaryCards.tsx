import {
  BriefcaseIcon,
  ReceiptIcon,
  TrendingUpIcon,
  WalletIcon,
} from "@/components/shell/icons";
import { SummaryCard } from "@/components/ui/summary-card";
import { formatRupiah, projectStats } from "@/lib/mock-data";

const CARDS = [
  {
    label: "Active projects",
    value: String(projectStats.active),
    Icon: BriefcaseIcon,
    iconClasses: "bg-primary-50 text-primary-500",
  },
  {
    label: "Close to billing",
    value: String(projectStats.nearBilling),
    Icon: ReceiptIcon,
    iconClasses: "bg-chip-success-bg text-chip-success-icon",
  },
  {
    label: "Over budget",
    value: String(projectStats.overBudget),
    Icon: TrendingUpIcon,
    iconClasses: "bg-chip-error-bg text-chip-error-icon",
  },
  {
    label: "Signed work not yet billed",
    value: formatRupiah(projectStats.pipelineValue),
    Icon: WalletIcon,
    iconClasses: "bg-primary-50 text-primary-500",
  },
];

export default function ProjectSummaryCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CARDS.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  );
}
