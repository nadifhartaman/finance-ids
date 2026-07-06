import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Check backend/.env (see .env.example).`,
    );
  }
  return value;
}

export const env = {
  SUPABASE_URL: required("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),
  SUPABASE_ANON_KEY: required("SUPABASE_ANON_KEY"),
  PORT: Number(process.env.PORT ?? 4000),
  /** Demo time-travel override for "today" (YYYY-MM-DD); unset in production. */
  APP_TODAY: process.env.APP_TODAY || undefined,
};
