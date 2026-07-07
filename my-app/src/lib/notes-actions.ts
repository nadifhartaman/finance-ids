"use server";

/** Dashboard notes (Phase 3 of .scratch/user-management/PRD.md) — notes.write role. */
import { revalidatePath } from "next/cache";
import { authedFetch } from "./authed-fetch";

export interface NoteState {
  error: string | null;
}

export async function createNote(_prevState: NoteState, formData: FormData): Promise<NoteState> {
  const body = formData.get("body");
  if (typeof body !== "string" || !body.trim()) {
    return { error: "Write something before saving." };
  }

  const res = await authedFetch("/api/notes", {
    method: "POST",
    body: JSON.stringify({ body: body.trim() }),
  });
  if (!res.ok) {
    const responseBody = await res.json().catch(() => null);
    return { error: responseBody?.error ?? "Failed to save note." };
  }

  revalidatePath("/");
  return { error: null };
}
