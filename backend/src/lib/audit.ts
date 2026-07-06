import { supabase } from "./supabase.js";
import type { Database, Json } from "../types/database.js";

type EntityType = Database["public"]["Enums"]["entity_type"];

export interface AuditEntry {
  userId: string;
  action: string;
  entity: EntityType;
  entityId?: string | null;
  before?: Json | null;
  after?: Json | null;
}

/** Best-effort audit write — never lets a logging failure fail the caller's request. */
export async function logAudit(entry: AuditEntry): Promise<void> {
  const { error } = await supabase.from("audit_log").insert({
    user_id: entry.userId,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
  });
  if (error) console.error("logAudit failed:", error);
}
