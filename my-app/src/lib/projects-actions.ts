"use server";

/** Project flag (Phase 3 of .scratch/user-management/PRD.md) — projects.flag role. */
import { patchAction } from "./authed-fetch";

export async function updateProjectFlag(
  id: string,
  isFlagged: boolean,
): Promise<{ error: string | null }> {
  return patchAction(
    `/api/projects/${id}/flag`,
    { isFlagged },
    ["/projects", "/"],
    "Failed to update project.",
  );
}
