-- ============================================================================
-- finance-ids — accounting core (double-entry general ledger)
-- Source of truth: docs/erd.md (accounting section), plan at
-- .claude/plans (accounting data model redesign)
--
-- This migration is purely additive: no existing table, column, or row is
-- touched. It introduces the ledger layer (chart of accounts, journals,
-- journal entries/lines, settings, fiscal periods) that later migrations
-- (0003+) wire the existing invoices/expenses/projects into.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Enums
-- ----------------------------------------------------------------------------

create type account_type as enum ('asset', 'liability', 'equity', 'revenue', 'expense');

-- Drives report placement and behavior (reconcilable, counts-as-cash) —
-- report code switches on subtype, never on account code prefixes.
create type account_subtype as enum (
  'bank', 'cash', 'receivable', 'prepaid', 'other_current_asset', 'fixed_asset',
  'payable', 'tax_payable', 'payroll_payable', 'loan', 'other_current_liability',
  'capital', 'retained_earnings', 'opening_balance',
  'operating_revenue', 'other_revenue',
  'project_cost', 'payroll_expense', 'operating_expense', 'financial_expense'
);

create type journal_type as enum ('sale', 'purchase', 'bank', 'cash', 'payroll', 'general');

create type entry_status as enum ('draft', 'posted', 'cancelled');

-- What generated this entry — lets a report or an audit trail walk back to
-- the source document without a generic "notes" search.
create type entry_source as enum (
  'invoice', 'payment', 'expense', 'loan_transaction', 'payroll', 'opening', 'manual', 'reversal'
);

-- ----------------------------------------------------------------------------
-- 2. Tables
-- ----------------------------------------------------------------------------

create table accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  type account_type not null,
  subtype account_subtype not null,
  parent_id uuid references accounts (id) on delete restrict,
  is_postable boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table journals (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  type journal_type not null,
  default_account_id uuid references accounts (id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type not in ('bank', 'cash') or default_account_id is not null)
);

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references journals (id) on delete restrict,
  entry_number text not null unique,
  accounting_date date not null,
  reference text,
  description text not null,
  status entry_status not null default 'draft',
  source_type entry_source not null default 'manual',
  source_id uuid,
  reversal_of_id uuid references journal_entries (id) on delete restrict,
  created_by uuid not null references profiles (id) on delete restrict,
  posted_at timestamptz,
  posted_by uuid references profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'posted') = (posted_at is not null)),
  check (source_type = 'manual' or source_id is not null)
);

-- At most one live (non-cancelled) posting per source document.
create unique index journal_entries_source_unique_idx on journal_entries (source_type, source_id)
  where source_id is not null and status <> 'cancelled';

create table journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references journal_entries (id) on delete cascade,
  line_no int not null,
  account_id uuid not null references accounts (id) on delete restrict,
  -- FK to partners added in 0003_partners.sql, once `clients` is renamed —
  -- `partners` doesn't exist yet at this point in the migration sequence.
  partner_id uuid,
  project_id uuid references projects (id) on delete restrict,
  description text,
  debit bigint not null default 0 check (debit >= 0),
  credit bigint not null default 0 check (credit >= 0),
  check ((debit > 0) <> (credit > 0)),
  unique (journal_entry_id, line_no)
);

-- Named account/value mappings so posting code never hardcodes an account
-- id or code — rename an account, renumber the COA, swap banks, no code
-- change. Keys used by the posting engine (backend/src/lib/accounting/):
-- ar_account, ap_account, default_bank, default_cash, revenue_project,
-- revenue_other, expense_payroll, expense_operations, expense_project_costs,
-- payroll_payable, interest_expense, vat_output, wht_prepaid,
-- retained_earnings, opening_balance_equity (all account_id), plus
-- non-account keys stored in `value` (e.g. lock_date).
create table accounting_settings (
  key text primary key,
  account_id uuid references accounts (id) on delete restrict,
  value text,
  updated_at timestamptz not null default now()
);

create table fiscal_periods (
  id uuid primary key default gen_random_uuid(),
  period date not null unique check (period = date_trunc('month', period)::date),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. Indexes
-- ----------------------------------------------------------------------------

create index accounts_parent_id_idx on accounts (parent_id);
create index accounts_type_idx on accounts (type);
create index journals_default_account_id_idx on journals (default_account_id);
create index journal_entries_journal_id_idx on journal_entries (journal_id);
create index journal_entries_accounting_date_idx on journal_entries (accounting_date);
create index journal_entries_status_idx on journal_entries (status);
create index journal_entries_created_by_idx on journal_entries (created_by);
create index journal_entries_posted_by_idx on journal_entries (posted_by);
create index journal_entries_reversal_of_id_idx on journal_entries (reversal_of_id);
create index journal_entry_lines_journal_entry_id_idx on journal_entry_lines (journal_entry_id);
create index journal_entry_lines_account_id_idx on journal_entry_lines (account_id);
create index journal_entry_lines_project_id_idx on journal_entry_lines (project_id)
  where project_id is not null;
create index journal_entry_lines_partner_id_idx on journal_entry_lines (partner_id)
  where partner_id is not null;

-- ----------------------------------------------------------------------------
-- 4. updated_at triggers (reuses set_updated_at() from 0001)
-- ----------------------------------------------------------------------------

create trigger set_updated_at before update on accounts
  for each row execute function set_updated_at();
create trigger set_updated_at before update on journals
  for each row execute function set_updated_at();
create trigger set_updated_at before update on journal_entries
  for each row execute function set_updated_at();
create trigger set_updated_at before update on accounting_settings
  for each row execute function set_updated_at();
create trigger set_updated_at before update on fiscal_periods
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Posting integrity — the double-entry invariants live in the database,
-- not in application code, so no write path (current or future) can bypass
-- them.
-- ----------------------------------------------------------------------------

-- 5a. A posted entry can never be updated or deleted directly. The only way
-- to correct one is a reversal entry (source_type = 'reversal',
-- reversal_of_id set) plus a fresh correct entry — both brand new rows.
create function check_journal_entry_immutable()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'posted' then
    raise exception
      'Journal entry % is posted and cannot be modified; create a reversal instead', old.id;
  end if;
  return new;
end;
$$;

create trigger trg_je_immutable before update on journal_entries
  for each row when (old.status = 'posted')
  execute function check_journal_entry_immutable();

create function block_delete_posted_journal_entry()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Journal entry % is posted and cannot be deleted', old.id;
end;
$$;

create trigger trg_je_no_delete_posted before delete on journal_entries
  for each row when (old.status = 'posted')
  execute function block_delete_posted_journal_entry();

-- 5b. Lines of a posted entry are equally immutable (covers the case where
-- someone tries to sneak a line change past the entry-level guard above).
create function check_journal_entry_lines_immutable()
returns trigger
language plpgsql
as $$
declare
  v_status entry_status;
begin
  select status into v_status from journal_entries
    where id = coalesce(new.journal_entry_id, old.journal_entry_id);
  if v_status = 'posted' then
    raise exception
      'Cannot modify lines of posted journal entry %', coalesce(new.journal_entry_id, old.journal_entry_id);
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_je_lines_immutable before insert or update or delete on journal_entry_lines
  for each row execute function check_journal_entry_lines_immutable();

-- 5c. Posting (draft/cancelled -> posted) requires >=2 lines, debit=credit,
-- and an open fiscal period for the entry's accounting_date. This is the
-- single gate every posting path (invoice, payment, expense, loan, payroll,
-- manual) goes through.
create function check_journal_entry_balanced()
returns trigger
language plpgsql
as $$
declare
  v_line_count int;
  v_debit bigint;
  v_credit bigint;
  v_period_status text;
begin
  if old.status = 'cancelled' then
    raise exception 'Cannot post cancelled journal entry %', new.id;
  end if;

  select count(*), coalesce(sum(debit), 0), coalesce(sum(credit), 0)
    into v_line_count, v_debit, v_credit
    from journal_entry_lines where journal_entry_id = new.id;

  if v_line_count < 2 then
    raise exception 'Journal entry % must have at least 2 lines to post (has %)', new.id, v_line_count;
  end if;

  if v_debit <> v_credit then
    raise exception 'Journal entry % is not balanced: debit % <> credit %', new.id, v_debit, v_credit;
  end if;

  select status into v_period_status from fiscal_periods
    where period = date_trunc('month', new.accounting_date)::date;
  if v_period_status = 'closed' then
    raise exception 'Cannot post into closed fiscal period %', date_trunc('month', new.accounting_date)::date;
  end if;

  new.posted_at := coalesce(new.posted_at, now());
  return new;
end;
$$;

create trigger trg_je_balanced before update on journal_entries
  for each row when (old.status is distinct from 'posted' and new.status = 'posted')
  execute function check_journal_entry_balanced();

-- ----------------------------------------------------------------------------
-- 6. Row Level Security — same deny-all posture as every other table
-- (see 0001_init.sql §5). The backend's service-role key bypasses RLS;
-- authorization is Express middleware against `profiles.role`.
-- ----------------------------------------------------------------------------

alter table accounts enable row level security;
alter table journals enable row level security;
alter table journal_entries enable row level security;
alter table journal_entry_lines enable row level security;
alter table accounting_settings enable row level security;
alter table fiscal_periods enable row level security;
