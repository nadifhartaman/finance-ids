-- ============================================================================
-- finance-ids — atomic journal entry posting
--
-- Closes a documented Phase 1 limitation: posting.ts's postEntry() used to
-- make 3 separate round trips (insert draft entry, insert lines, flip status
-- to posted) with no transaction wrapping them. Confirmed reachable: posting
-- into a closed fiscal_periods row is only caught by trg_je_balanced on the
-- final status-flip UPDATE, so a failure there left a real, balanced draft
-- entry (+ its lines) behind permanently — excluded from every report
-- (status='posted' filter), but a genuine partial-post artifact and a burned
-- entry_number slot.
--
-- This function moves all 3 writes inside one plpgsql function body, which
-- Postgres already runs as a single transaction: if anything inside raises
-- (including the existing trg_je_balanced trigger), everything rolls back —
-- zero rows persisted. No existing trigger or invariant changes; this only
-- changes how many round trips it takes to reach them.
--
-- Also folds in entry-number allocation (previously computed client-side in
-- posting.ts's nextEntryNumber) under a per-journal-per-year advisory xact
-- lock, closing the documented concurrent-writer race on the sequence too.
-- ============================================================================

create function post_journal_entry(
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

  select coalesce(max(substring(entry_number from length(v_prefix) + 1)::int), 0)
    into v_last_seq
    from journal_entries
    where journal_id = p_journal_id
      and entry_number like v_prefix || '%';

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
