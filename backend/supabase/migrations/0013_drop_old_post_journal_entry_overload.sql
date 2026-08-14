-- ============================================================================
-- finance-ids — drop the stale 10-arg post_journal_entry() overload
--
-- 0012 added a trailing p_status parameter via `create or replace function`,
-- expecting it to replace the existing function in place. Postgres doesn't
-- work that way: a function's identity is (name, parameter type list), so
-- adding a parameter — even one with a default — creates a *second*,
-- separate overload rather than replacing the first. Confirmed live via
-- pg_proc: both the original 10-arg signature and the new 11-arg one exist
-- side by side after 0012 ran.
--
-- Harmless today only because every caller (posting.ts's postEntry()) always
-- passes p_status explicitly by name, which resolves unambiguously to the
-- 11-arg overload. But it's real drift — a stale, unmaintained copy of the
-- posting logic left live in the schema — and a footgun for any future
-- caller (a raw SQL script, a different client) that calls with exactly the
-- original 10 named args, which Postgres would then have to disambiguate
-- between "the 10-arg function" and "the 11-arg function using its default".
-- Drop the old one now, before anything comes to depend on it.
-- ============================================================================

drop function if exists post_journal_entry(
  p_journal_id uuid,
  p_journal_code text,
  p_accounting_date date,
  p_reference text,
  p_description text,
  p_source_type entry_source,
  p_source_id uuid,
  p_reversal_of_id uuid,
  p_actor_id uuid,
  p_lines jsonb
);
