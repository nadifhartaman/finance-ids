import ProjectSummaryCards from "@/components/projects/ProjectSummaryCards";
import ProjectTable from "@/components/projects/ProjectTable";
import { getRequiredUser } from "@/lib/auth";
import { getClients, getProjects } from "@/lib/api";
import { can } from "@/lib/roles";

export default async function ProjectsPage() {
  const [{ projects, stats }, user, { clients }] = await Promise.all([
    getProjects(),
    getRequiredUser(),
    getClients(),
  ]);
  const canWrite = can(user.role, "projects.write");
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
          canWrite={canWrite}
          clients={canWrite ? clients : []}
        />
      </div>
    </>
  );
}
