-- ============================================================================
-- finance-ids — accounting backfill verification
--
-- Not a migration — a read-only checklist, safe to re-run any time. Run
-- after 0006_backfill_gl.sql (or after any accounting posting change) to
-- confirm the ledger is internally consistent and still agrees with the
-- pre-migration numbers.
--
--   psql "$DATABASE_URL" -f backend/supabase/verify_accounting_backfill.sql
--
-- Every query below should return 0 rows / 0, except #7 which should print
-- the plug amount and needs eyeballing against expectations, not a bot check.
-- ============================================================================

-- 1. The ledger balances globally — expect 0
select sum(debit) - sum(credit) as global_imbalance
from journal_entry_lines l
join journal_entries e on e.id = l.journal_entry_id
where e.status = 'posted';

-- 2. Every posted entry individually balances — expect 0 rows
select l.journal_entry_id, sum(l.debit) as debit, sum(l.credit) as credit
from journal_entry_lines l
join journal_entries e on e.id = l.journal_entry_id
where e.status = 'posted'
group by l.journal_entry_id
having sum(l.debit) <> sum(l.credit);

-- 3. Every posted entry has >= 2 lines — expect 0 rows
select e.id, count(*) as line_count
from journal_entries e
join journal_entry_lines l on l.journal_entry_id = e.id
where e.status = 'posted'
group by e.id
having count(*) < 2;

-- 4. Derived amount_paid (from payment_allocations) matches the stored
-- counter, for every invoice — expect 0 rows
select i.id, i.invoice_number, i.amount_paid as stored, coalesce(p.amt, 0) as derived
from invoices i
left join (
  select invoice_id, sum(amount) as amt from payment_allocations group by invoice_id
) p on p.invoice_id = i.id
where coalesce(p.amt, 0) <> i.amount_paid;

-- 5. Derived A/R account balance equals Σ outstanding over open invoices
-- (compare the two numbers by eye — both sides of one equation)
select
  (select coalesce(sum(l.debit) - sum(l.credit), 0)
     from journal_entry_lines l
     join journal_entries e on e.id = l.journal_entry_id
     join accounting_settings s on s.key = 'ar_account'
     where e.status = 'posted' and l.account_id = s.account_id) as ar_account_balance,
  (select coalesce(sum(amount - amount_paid), 0)
     from invoices where voided_at is null) as sum_outstanding_invoices;

-- 6. Derived bank balance equals the latest cash_snapshots row
-- (compare the two numbers by eye)
select
  (select coalesce(sum(l.debit) - sum(l.credit), 0)
     from journal_entry_lines l
     join journal_entries e on e.id = l.journal_entry_id
     join accounting_settings s on s.key = 'default_bank'
     where e.status = 'posted' and l.account_id = s.account_id) as ledger_bank_balance,
  (select amount from cash_snapshots order by as_of desc limit 1) as latest_snapshot;

-- 7. Monthly revenue from the GL vs. the accrual rule used by
-- GET /api/trends (Σ non-voided invoice amount by issued_date month) —
-- every row should show equal columns
select
  to_char(coalesce(gl.gl_month, api.api_month), 'YYYY-MM') as month,
  coalesce(gl.gl_revenue, 0) as gl_revenue,
  coalesce(api.api_revenue, 0) as api_revenue
from (
  select date_trunc('month', e.accounting_date) as gl_month, sum(l.credit - l.debit) as gl_revenue
  from journal_entry_lines l
  join journal_entries e on e.id = l.journal_entry_id
  join accounting_settings s on s.key = 'revenue_project'
  where e.status = 'posted' and l.account_id = s.account_id
  group by 1
) gl
full outer join (
  select date_trunc('month', issued_date) as api_month, sum(amount) as api_revenue
  from invoices where voided_at is null
  group by 1
) api on api.api_month = gl.gl_month
order by 1;
