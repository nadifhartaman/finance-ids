-- ============================================================================
-- finance-ids — fix ambiguous column reference in post_journal_entry()
--
-- 0009's RETURNS TABLE (id uuid, entry_number text) implicitly declares
-- `id`/`entry_number` as function-scoped variables, which shadowed
-- journal_entries' own `entry_number`/`id` columns in the sequence-lookup
-- query, raising "column reference entry_number is ambiguous" the first
-- time this ran for real (caught by scripts/verify-invariants.ts). Fix:
-- qualify every reference to those columns with the table name. No
-- behavior change beyond making it actually run.
-- ============================================================================

create or replace function post_journal_entry(
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
)
returns table (id uuid, entry_number text)
language plpgsql
as $$
declare
  v_year text := to_char(p_accounting_date, 'YYYY');
  v_prefix text := p_journal_code || '/' || v_year || '/';
  v_last_seq int;
  v_entry_number text;
  v_entry_id uuid;
begin
  -- Serializes entry-number allocation per journal/year across concurrent
  -- callers; released automatically at transaction end.
  perform pg_advisory_xact_lock(hashtextextended(v_prefix, 0));

  select coalesce(max(substring(journal_entries.entry_number from length(v_prefix) + 1)::int), 0)
    into v_last_seq
    from journal_entries
    where journal_entries.journal_id = p_journal_id
      and journal_entries.entry_number like v_prefix || '%';

  v_entry_number := v_prefix || lpad((v_last_seq + 1)::text, 4, '0');

  insert into journal_entries (
    journal_id, entry_number, accounting_date, reference, description,
    status, source_type, source_id, reversal_of_id, created_by
  ) values (
    p_journal_id, v_entry_number, p_accounting_date, p_reference, p_description,
    'draft', p_source_type, p_source_id, p_reversal_of_id, p_actor_id
  )
  returning journal_entries.id into v_entry_id;

  insert into journal_entry_lines (
    journal_entry_id, line_no, account_id, partner_id, project_id, description, debit, credit
  )
  select
    v_entry_id,
    row_number() over (),
    (line->>'accountId')::uuid,
    (line->>'partnerId')::uuid,
    (line->>'projectId')::uuid,
    line->>'description',
    (line->>'debit')::bigint,
    (line->>'credit')::bigint
  from jsonb_array_elements(p_lines) as line;

  update journal_entries
    set status = 'posted', posted_by = p_actor_id
    where journal_entries.id = v_entry_id;

  return query select v_entry_id, v_entry_number;
end;
$$;
