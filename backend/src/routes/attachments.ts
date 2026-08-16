import { randomUUID } from "node:crypto";
import { Router } from "express";
import { requirePermission } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";

export const attachmentsRouter = Router();

const BUCKET = "documents";
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const ENTITY_TYPES = new Set(["expense", "invoice", "journal_entry"]);

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

/**
 * Mints a short-lived Storage signed upload URL. The browser PUTs the file
 * bytes straight to Supabase Storage from there — nothing routes through
 * this API, so there's no body-size limit to configure here and no new
 * dependency (no multer). See help-me-plan-for-foamy-bird.md Phase C.
 */
attachmentsRouter.post("/upload-url", requirePermission("spending.write"), async (req, res) => {
  const { entityType, entityId, fileName, mimeType, sizeBytes } = req.body ?? {};

  if (typeof entityType !== "string" || !ENTITY_TYPES.has(entityType)) {
    res.status(400).json({ error: "entityType must be one of expense, invoice, journal_entry" });
    return;
  }
  if (typeof entityId !== "string" || !entityId) {
    res.status(400).json({ error: "entityId is required" });
    return;
  }
  if (typeof fileName !== "string" || !fileName.trim()) {
    res.status(400).json({ error: "fileName is required" });
    return;
  }
  if (typeof mimeType !== "string" || !ALLOWED_MIME_TYPES.has(mimeType)) {
    res.status(400).json({ error: "File type must be PDF, PNG, JPEG, or WebP" });
    return;
  }
  if (typeof sizeBytes !== "number" || sizeBytes <= 0 || sizeBytes > MAX_SIZE_BYTES) {
    res.status(400).json({ error: "File must be between 1 byte and 10MB" });
    return;
  }

  const path = `${entityType}/${entityId}/${randomUUID()}-${sanitizeFileName(fileName)}`;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) throw error;

  res.json({ path, token: data.token, signedUrl: data.signedUrl });
});

/** Records the attachment row after the browser's PUT to the signed URL succeeded. */
attachmentsRouter.post("/", requirePermission("spending.write"), async (req, res) => {
  const { entityType, entityId, storagePath, fileName, mimeType, sizeBytes } = req.body ?? {};

  if (typeof entityType !== "string" || !ENTITY_TYPES.has(entityType)) {
    res.status(400).json({ error: "entityType must be one of expense, invoice, journal_entry" });
    return;
  }
  if (typeof entityId !== "string" || !entityId) {
    res.status(400).json({ error: "entityId is required" });
    return;
  }
  if (typeof storagePath !== "string" || !storagePath.startsWith(`${entityType}/${entityId}/`)) {
    res.status(400).json({ error: "storagePath does not match entityType/entityId" });
    return;
  }
  if (typeof fileName !== "string" || !fileName.trim()) {
    res.status(400).json({ error: "fileName is required" });
    return;
  }
  if (typeof mimeType !== "string" || !ALLOWED_MIME_TYPES.has(mimeType)) {
    res.status(400).json({ error: "File type must be PDF, PNG, JPEG, or WebP" });
    return;
  }
  if (typeof sizeBytes !== "number" || sizeBytes <= 0 || sizeBytes > MAX_SIZE_BYTES) {
    res.status(400).json({ error: "File must be between 1 byte and 10MB" });
    return;
  }

  const { data, error } = await supabase
    .from("attachments")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      storage_path: storagePath,
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      uploaded_by: req.user!.id,
    })
    .select("id")
    .single();
  if (error) throw error;

  res.status(201).json({ id: data.id });
});

/** List attachments for a document, each with a 60s signed view URL. */
attachmentsRouter.get("/", async (req, res) => {
  const { entityType, entityId } = req.query;
  if (typeof entityType !== "string" || !ENTITY_TYPES.has(entityType)) {
    res.status(400).json({ error: "entityType must be one of expense, invoice, journal_entry" });
    return;
  }
  if (typeof entityId !== "string" || !entityId) {
    res.status(400).json({ error: "entityId is required" });
    return;
  }

  const { data: rows, error } = await supabase
    .from("attachments")
    .select("id, storage_path, file_name, mime_type, size_bytes, created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at");
  if (error) throw error;

  const attachments = await Promise.all(
    rows.map(async (row) => {
      const { data: signed, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, 60);
      if (signError) throw signError;
      return {
        id: row.id,
        fileName: row.file_name,
        mimeType: row.mime_type,
        sizeBytes: row.size_bytes,
        createdAt: row.created_at,
        viewUrl: signed.signedUrl,
      };
    }),
  );

  res.json({ attachments });
});

attachmentsRouter.delete("/:id", requirePermission("spending.write"), async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid attachment id" });
    return;
  }

  const { data: row, error: fetchError } = await supabase
    .from("attachments")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!row) {
    res.status(404).json({ error: "Attachment not found" });
    return;
  }

  const { error: removeError } = await supabase.storage.from(BUCKET).remove([row.storage_path]);
  if (removeError) throw removeError;

  const { error: deleteError } = await supabase.from("attachments").delete().eq("id", id);
  if (deleteError) throw deleteError;

  res.status(204).send();
});
