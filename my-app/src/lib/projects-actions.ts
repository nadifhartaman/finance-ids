"use server";

/** Project flag (Phase 3 of .scratch/user-management/PRD.md) — projects.flag role. */
import { revalidatePath } from "next/cache";
import { authedFetch } from "./authed-fetch";

export async function updateProjectFlag(
  id: string,
  isFlagged: boolean,
): Promise<{ error: string | null }> {
  const res = await authedFetch(`/api/projects/${id}/flag`, {
    method: "PATCH",
    body: JSON.stringify({ isFlagged }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.error ?? "Failed to update project." };
  }
  revalidatePath("/projects");
  revalidatePath("/");
  return { error: null };
}
