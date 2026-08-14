-- ============================================================================
-- finance-ids — expenses become real accounting documents
--
-- Expenses today insert-and-post in one shot: no draft state, no document
-- number, no record of which bank account the money left from (posting
-- always hard-coded Bank BCA / BNK1). This adds a Draft ▸ Posted lifecycle
-- and a proper document number, mirroring the journal_entries lifecycle
-- already shipped. See help-me-plan-for-foamy-bird.md Phase A.
-- ============================================================================

create type expense_status as enum ('draft', 'posted', 'cancelled');

alter table expenses
  add column status expense_status not null default 'posted',
  add column document_number text unique,
  add column paid_from_account_id uuid references accounts (id),
  add column posted_at timestamptz,
  add column posted_by uuid references profiles (id);

-- Backfill: every existing row is already posted to the ledger. Assign a
-- document number per calendar year of spent_on, ordered by when it
-- actually happened.
with numbered as (
  select
    id,
    'EXP/' || extract(year from spent_on)::text || '/' ||
      lpad(
        row_number() over (
          partition by extract(year from spent_on)
          order by spent_on, created_at
        )::text,
        5, '0'
      ) as doc_number
  from expenses
)
update expenses
  set document_number = numbered.doc_number,
      posted_at = expenses.created_at
  from numbered
  where expenses.id = numbered.id;

-- Backfill paid_from_account_id from the ledger truth: the credit-side
-- account of each expense's posted journal entry. Vendor bills resolve to
-- A/P, cash expenses to whichever bank/cash account was actually credited
-- (always Bank BCA historically, since that was hard-coded — but deriving
-- it from the ledger rather than assuming it is the correct thing to do).
with credit_line as (
  select distinct on (je.source_id)
    je.source_id as expense_id,
    jel.account_id
  from journal_entries je
  join journal_entry_lines jel on jel.journal_entry_id = je.id
  where je.source_type = 'expense'
    and je.status = 'posted'
    and jel.credit > 0
  order by je.source_id, jel.line_no
)
update expenses
  set paid_from_account_id = credit_line.account_id
  from credit_line
  where expenses.id = credit_line.expense_id;

-- New rows start as drafts; the backfill above is the only thing that
-- needed the 'posted' default.
alter table expenses alter column status set default 'draft';

create index expenses_status_idx on expenses (status) where status <> 'posted';

-- Same per-journal/year advisory-lock pattern as post_journal_entry()
-- (0010_fix_post_journal_entry_ambiguous_column.sql) so concurrent posts
-- can't collide on the same number.
create or replace function next_expense_number(p_year int)
returns text
language plpgsql
as $$
declare
  v_prefix text := 'EXP/' || p_year::text || '/';
  v_last_seq int;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_prefix, 0));

  select coalesce(max(substring(expenses.document_number from length(v_prefix) + 1)::int), 0)
    into v_last_seq
    from expenses
    where expenses.document_number like v_prefix || '%';

  return v_prefix || lpad((v_last_seq + 1)::text, 5, '0');
end;
$$;
