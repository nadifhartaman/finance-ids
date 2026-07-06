import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";
import type { Database } from "../types/database.js";

// Single shared client, service-role key — bypasses RLS. Server-side only,
// never expose this client or the key to the frontend. See backend/CLAUDE.md.
export const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Anon-key client, used only for GoTrue user-auth calls (sign in, token
// verification) — never for data access. persistSession/autoRefreshToken are
// off because this is a shared server-side instance, not a per-user session.
export const supabaseAuth = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
