import SectionCard from "@/components/ui/section-card";
import { getProjectProfitability } from "@/lib/api";
import ProjectPerformanceTable from "./ProjectPerformanceTable";

export default async function ProjectPerformanceSection() {
  const { projects } = await getProjectProfitability(undefined, 10);

  return (
    <SectionCard
      title="Project Performance"
      question="Which projects are actually making us money, as of the ledger?"
    >
      {projects.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-secondary">No project-tagged postings yet.</p>
      ) : (
        <ProjectPerformanceTable projects={projects} />
      )}
    </SectionCard>
  );
}
