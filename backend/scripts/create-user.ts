/**
 * One-off account bootstrap for when there's no admin account yet to use the
 * POST /api/users endpoint. Usage:
 *   npx tsx scripts/create-user.ts <email> <password> <role> "<Full Name>"
 */
import "dotenv/config";
import { createUser } from "../src/lib/users.js";
import { isRole, VALID_ROLES } from "../src/lib/permissions.js";

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

  try {
    const user = await createUser({ email, password, fullName, role });
    console.log(`Created ${user.role} account for ${user.email} (${user.name}).`);
  } catch (err) {
    console.error("Failed to create user:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
