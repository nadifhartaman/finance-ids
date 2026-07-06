import ProjectSummaryCards from "@/components/projects/ProjectSummaryCards";
import ProjectTable from "@/components/projects/ProjectTable";
import { getCurrentUser } from "@/lib/auth-mock";
import { getProjects } from "@/lib/api";
import { can } from "@/lib/roles";

export default async function ProjectsPage() {
  const { projects, stats } = await getProjects();
  const user = await getCurrentUser();
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
        <ProjectSummaryCards stats={stats} />
      </div>

      <div className="mt-8">
        <ProjectTable
          projects={projects}
          canFlag={can(user.role, "projects.flag")}
        />
      </div>
    </>
  );
}
