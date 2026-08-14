-- ============================================================================
-- finance-ids — indexes for the accounting report queries
--
-- fetchArAging/fetchApAging (backend/src/lib/accounting/reports.ts) filter and
-- join on invoices.due_date (scoped to open invoices) and
-- payment_allocations.expense_id. Postgres does not auto-index FK columns
-- (only the referenced PK), so neither had an index. Harmless at current
-- seed-data volume; added ahead of real data growth.
-- ============================================================================

create index if not exists idx_invoices_due_date
  on invoices (due_date)
  where voided_at is null;

create index if not exists idx_payment_allocations_expense_id
  on payment_allocations (expense_id)
  where expense_id is not null;
