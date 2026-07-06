import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";
import type { Database } from "../types/database.js";

// Single shared client, service-role key — bypasses RLS. Server-side only,
// never expose this client or the key to the frontend. See backend/CLAUDE.md.
export const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
