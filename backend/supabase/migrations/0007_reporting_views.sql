-- ============================================================================
-- finance-ids — reporting views and functions
--
-- Every report (P&L, Balance Sheet, Cash Flow, Trial Balance, GL, AR/AP
-- aging, project profitability, debt outstanding) reduces to a filtered
-- SUM(debit)/SUM(credit) over posted journal_entry_lines. This migration
-- ships the shared building block (v_posted_lines) plus the handful of
-- views/functions the reports layer (backend/src/lib/accounting/reports.ts)
-- calls directly, so a new report is a new WHERE clause, not a new table.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. v_posted_lines — every posted line, denormalized with its account and
-- entry metadata. The base every other view/function below builds on.
-- ----------------------------------------------------------------------------

create view v_posted_lines as
select
  l.id as line_id,
  l.journal_entry_id,
  l.account_id,
  a.code as account_code,
  a.name as account_name,
  a.type as account_type,
  a.subtype as account_subtype,
  l.partner_id,
  l.project_id,
  l.description as line_description,
  l.debit,
  l.credit,
  e.journal_id,
  j.code as journal_code,
  e.accounting_date,
  e.entry_number,
  e.source_type,
  e.source_id
from journal_entry_lines l
join journal_entries e on e.id = l.journal_entry_id
join accounts a on a.id = l.account_id
join journals j on j.id = e.journal_id
where e.status = 'posted';

-- ----------------------------------------------------------------------------
-- 2. v_account_balances — full-history balance per account (asset/expense
-- accounts read naturally as debit-positive via `balance`; report code
-- negates for liability/equity/revenue as needed).
-- ----------------------------------------------------------------------------

create view v_account_balances as
select
  a.id as account_id,
  a.code as account_code,
  a.name as account_name,
  a.type as account_type,
  a.subtype as account_subtype,
  coalesce(sum(p.debit), 0) as total_debit,
  coalesce(sum(p.credit), 0) as total_credit,
  coalesce(sum(p.debit) - sum(p.credit), 0) as balance
from accounts a
left join v_posted_lines p on p.account_id = a.id
where a.is_postable
group by a.id, a.code, a.name, a.type, a.subtype;

-- ----------------------------------------------------------------------------
-- 3. v_invoice_paid — amount_paid derived from payment_allocations, for
-- comparison against the stored `invoices.amount_paid` counter (parity is
-- verified by verify_accounting_backfill.sql; once trusted, this becomes
-- the counter's replacement — see docs/erd.md decision on amount_paid).
-- ----------------------------------------------------------------------------

create view v_invoice_paid as
select
  i.id as invoice_id,
  i.invoice_number,
  i.amount,
  i.amount_paid as amount_paid_stored,
  coalesce(pa.derived_paid, 0) as amount_paid_derived,
  i.amount - coalesce(pa.derived_paid, 0) as outstanding_derived
from invoices i
left join (
  select invoice_id, sum(amount) as derived_paid
  from payment_allocations
  group by invoice_id
) pa on pa.invoice_id = i.id;

-- ----------------------------------------------------------------------------
-- 4. fn_trial_balance(as_of) — every postable account's balance as of a
-- date (default: all time). The literal Trial Balance report, and the base
-- every other financial statement (P&L, Balance Sheet) filters from.
-- ----------------------------------------------------------------------------

create function fn_trial_balance(p_as_of date default null)
returns table (
  account_id uuid,
  account_code text,
  account_name text,
  account_type account_type,
  account_subtype account_subtype,
  debit bigint,
  credit bigint,
  balance bigint
)
language sql
stable
as $$
  select
    a.id,
    a.code,
    a.name,
    a.type,
    a.subtype,
    coalesce(sum(p.debit), 0),
    coalesce(sum(p.credit), 0),
    coalesce(sum(p.debit) - sum(p.credit), 0)
  from accounts a
  left join v_posted_lines p
    on p.account_id = a.id
    and (p_as_of is null or p.accounting_date <= p_as_of)
  where a.is_postable
  group by a.id, a.code, a.name, a.type, a.subtype
  order by a.code;
$$;

-- ----------------------------------------------------------------------------
-- 5. fn_project_pl(project_id, as_of) — project profitability, derived
-- from the project analytic dimension on journal_entry_lines. Nothing about
-- a project's revenue/cost is stored on the `projects` row itself.
-- ----------------------------------------------------------------------------

create function fn_project_pl(p_project_id uuid, p_as_of date default null)
returns table (
  revenue bigint,
  cost bigint,
  profit bigint
)
language sql
stable
as $$
  select
    coalesce(sum(case when account_type = 'revenue' then credit - debit else 0 end), 0) as revenue,
    coalesce(sum(case when account_type = 'expense' then debit - credit else 0 end), 0) as cost,
    coalesce(sum(case when account_type = 'revenue' then credit - debit else 0 end), 0)
      - coalesce(sum(case when account_type = 'expense' then debit - credit else 0 end), 0) as profit
  from v_posted_lines
  where project_id = p_project_id
    and (p_as_of is null or accounting_date <= p_as_of);
$$;
