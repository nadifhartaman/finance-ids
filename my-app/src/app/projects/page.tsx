import ProjectSummaryCards from "@/components/projects/ProjectSummaryCards";
import ProjectTable from "@/components/projects/ProjectTable";
import { projectsSorted } from "@/lib/mock-data";

export default function ProjectsPage() {
  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-title">
          Projects
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Which projects are healthy, and what is close to being billable?
        </p>
      </header>

      <div className="mt-6">
        <ProjectSummaryCards />
      </div>

      <div className="mt-4">
        <ProjectTable projects={projectsSorted} />
      </div>
    </>
  );
}
