import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/ui/table";
import { Chip, type ChipColor } from "@/components/ui/chip";
import type { Project, ProjectHealthKind } from "@/lib/mock-data";
import { formatRupiah, projectHealth } from "@/lib/mock-data";

const STATUS_CHIP_COLOR: Record<ProjectHealthKind, ChipColor> = {
  "over-budget": "error",
  "near-billing": "primary",
  "on-schedule": "success",
};

export default function ProjectTable({ projects }: { projects: Project[] }) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
      <TableRoot>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Product line</TableHead>
            <TableHead className="text-right">Contract value</TableHead>
            <TableHead>Billing progress</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const health = projectHealth(project);
            return (
              <TableRow key={project.id}>
                <TableCell>
                  <p className="font-medium text-title">{project.name}</p>
                  <p className="text-xs text-ink-muted">{project.client}</p>
                </TableCell>
                <TableCell>{project.productLine}</TableCell>
                <TableCell className="text-right font-semibold text-title tabular-nums">
                  {formatRupiah(project.contractValue)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-soft">
                      <div
                        className="h-full rounded-full bg-primary-600"
                        style={{ width: `${Math.min(health.progressPct, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-secondary">
                      {health.progressPct}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Chip color={STATUS_CHIP_COLOR[health.kind]}>
                    {health.label}
                  </Chip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </TableRoot>
    </div>
  );
}
