"use server";

/** Revenue target edits (Phase 3 of .scratch/user-management/PRD.md) — targets.edit role. */
import { patchAction } from "./authed-fetch";

export async function updateRevenueTarget(
  period: string,
  targetAmount: number,
): Promise<{ error: string | null }> {
  return patchAction(
    `/api/trends/targets/${period}`,
    { targetAmount },
    ["/trends", "/"],
    "Failed to update target.",
  );
}
