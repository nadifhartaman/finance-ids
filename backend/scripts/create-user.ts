/**
 * One-off account bootstrap — no self-signup, superadmin creates accounts.
 * Usage: npx tsx scripts/create-user.ts <email> <password> <role> "<Full Name>"
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.js";
import { env } from "../src/lib/env.js";

const VALID_ROLES = ["superadmin", "admin", "director", "member"] as const;
type Role = (typeof VALID_ROLES)[number];

function isRole(value: string): value is Role {
  return (VALID_ROLES as readonly string[]).includes(value);
}

async function main() {
  const [email, password, role, fullName] = process.argv.slice(2);
  if (!email || !password || !role || !fullName) {
    console.error(
      'Usage: npx tsx scripts/create-user.ts <email> <password> <role> "<Full Name>"',
    );
    console.error(`<role> must be one of: ${VALID_ROLES.join(", ")}`);
    process.exit(1);
  }
  if (!isRole(role)) {
    console.error(`Invalid role "${role}". Must be one of: ${VALID_ROLES.join(", ")}`);
    process.exit(1);
  }

  // Service-role client, one-off — separate from the shared app client since
  // this script runs standalone and needs auth.admin.* (service key only).
  const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email verification — required or login fails
  });
  if (error || !data.user) {
    console.error("Failed to create auth user:", error?.message);
    process.exit(1);
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    full_name: fullName,
    role,
  });
  if (profileError) {
    console.error("Auth user created but profile insert failed:", profileError.message);
    process.exit(1);
  }

  console.log(`Created ${role} account for ${email} (${fullName}).`);
}

main();
