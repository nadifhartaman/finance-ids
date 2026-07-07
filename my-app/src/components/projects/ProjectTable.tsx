"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/ui/table";
import { Chip, type ChipColor } from "@/components/ui/chip";
import type { ClientOption, Project, ProjectHealthKind } from "@/lib/types";
import { formatRupiah } from "@/lib/format";
import { deleteProject } from "@/lib/projects-actions";
import FlagProjectButton from "./FlagProjectButton";
import ProjectFormDialog from "./ProjectFormDialog";

const STATUS_CHIP_COLOR: Record<ProjectHealthKind, ChipColor> = {
  "over-budget": "error",
  "near-billing": "primary",
  "on-schedule": "success",
};

export default function ProjectTable({
  projects,
  canFlag = false,
  canWrite = false,
  clients = [],
}: {
  projects: Project[];
  /** Shows the flag-for-review affordance; only passed for roles with `projects.flag`. */
  canFlag?: boolean;
  /** Shows add/edit/delete affordances; only passed for roles with `projects.write`. */
  canWrite?: boolean;
  /** For the "Add project" client dropdown; only needed when canWrite. */
  clients?: ClientOption[];
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<Project | "create" | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete(project: Project) {
    if (!window.confirm(`Delete project "${project.name}"? This can't be undone.`)) return;
    startDeleteTransition(async () => {
      const result = await deleteProject(project.id);
      if (result.error) {
        setNotice(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
      {canWrite && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => setFormTarget("create")}
            className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Add project
          </button>
        </div>
      )}

      {notice && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-lg bg-soft px-3 py-2 text-sm text-ink-secondary">
          <p>{notice}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="shrink-0 text-xs font-medium text-primary-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <TableRoot>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Product line</TableHead>
            <TableHead className="text-right">Contract value</TableHead>
            <TableHead>Billing progress</TableHead>
            <TableHead>Status</TableHead>
            {(canFlag || canWrite) && <TableHead className="sr-only">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const health = project.health;
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
                {(canFlag || canWrite) && (
                  <TableCell className="text-right whitespace-nowrap">
                    {canWrite && (
                      <>
                        <button
                          type="button"
                          onClick={() => setFormTarget(project)}
                          className="rounded-md px-2 py-0.5 text-xs font-medium text-primary-700 hover:bg-primary-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => handleDelete(project)}
                          className="ml-1 rounded-md px-2 py-0.5 text-xs font-medium text-chip-error-text hover:bg-chip-error-bg disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {canFlag && (
                      <FlagProjectButton
                        projectId={project.id}
                        projectName={project.name}
                        initialFlagged={project.isFlagged}
                      />
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </TableRoot>

      {canWrite && (
        <ProjectFormDialog
          key={formTarget === "create" ? "create" : (formTarget?.id ?? "closed")}
          isOpen={formTarget !== null}
          onOpenChange={(open) => {
            if (!open) setFormTarget(null);
          }}
          clients={clients}
          project={formTarget === "create" ? undefined : (formTarget ?? undefined)}
        />
      )}
    </div>
  );
}
