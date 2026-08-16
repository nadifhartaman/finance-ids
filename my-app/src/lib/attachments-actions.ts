"use server";

/**
 * Nota/invoice-proof uploads. The browser hands the file to this server
 * action as FormData (Next server actions accept File values natively); the
 * Next server then mints a Supabase Storage signed upload URL via the
 * backend and PUTs the bytes there directly — the file never round-trips
 * through the Express API's JSON body. This is a narrow, deliberate
 * exception to "the frontend never talks to Supabase directly" (see
 * my-app/CLAUDE.md): a signed upload URL is self-authorizing (the token IS
 * the authorization), so no Supabase credentials ever reach this app —
 * unlike a direct DB read/write, which would need the anon key or worse.
 */
import { revalidatePath } from "next/cache";
import { authedFetch } from "./authed-fetch";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

export async function uploadAttachment(
  entityType: "expense" | "invoice" | "journal_entry",
  entityId: string,
  formData: FormData,
  revalidatePaths: string[],
): Promise<{ error: string | null }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file first." };
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { error: "File must be a PDF, PNG, JPEG, or WebP." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "File must be smaller than 10MB." };
  }

  const urlRes = await authedFetch("/api/attachments/upload-url", {
    method: "POST",
    body: JSON.stringify({
      entityType,
      entityId,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    }),
  });
  if (!urlRes.ok) {
    const body = await urlRes.json().catch(() => null);
    return { error: body?.error ?? "Failed to prepare the upload." };
  }
  const { path, signedUrl } = await urlRes.json();

  const putRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "content-type": file.type },
    body: await file.arrayBuffer(),
  });
  if (!putRes.ok) {
    return { error: "Failed to upload the file. Try again." };
  }

  const recordRes = await authedFetch("/api/attachments", {
    method: "POST",
    body: JSON.stringify({
      entityType,
      entityId,
      storagePath: path,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    }),
  });
  if (!recordRes.ok) {
    const body = await recordRes.json().catch(() => null);
    return { error: body?.error ?? "Failed to save the attachment." };
  }

  revalidatePaths.forEach((p) => revalidatePath(p));
  return { error: null };
}

export async function deleteAttachment(
  id: string,
  revalidatePaths: string[],
): Promise<{ error: string | null }> {
  const res = await authedFetch(`/api/attachments/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.error ?? "Failed to delete the attachment." };
  }
  revalidatePaths.forEach((p) => revalidatePath(p));
  return { error: null };
}
