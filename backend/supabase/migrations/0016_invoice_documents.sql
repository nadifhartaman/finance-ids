-- ============================================================================
-- finance-ids — invoices become real accounting documents
--
-- Invoices today insert-and-post in one shot: createInvoice() posts to the
-- ledger immediately, so there's no way to prepare/correct an invoice
-- before it's live in the books — the only correction path is voidInvoice,
-- which reverses via a journal entry and is blocked once any payment is
-- recorded. This adds a Draft ▸ Posted ▸ Cancelled lifecycle, mirroring the
-- one 0014_expense_documents.sql already gave expenses.
-- ============================================================================

create type invoice_status as enum ('draft', 'posted', 'cancelled');

alter table invoices
  add column status invoice_status not null default 'posted',
  add column posted_at timestamptz,
  add column posted_by uuid references profiles (id);

-- Backfill: every existing row is already posted to the ledger (createInvoice
-- always posted immediately before this migration).
update invoices set posted_at = created_at;

-- New rows start as drafts; the backfill above is the only thing that
-- needed the 'posted' default.
alter table invoices alter column status set default 'draft';

create index invoices_status_idx on invoices (status) where status <> 'posted';

-- Defense in depth: a draft invoice has no ledger entry, so it should never
-- carry payment/void facts — the application guards this too (updateInvoice,
-- recordInvoicePayment, voidInvoice all require status = 'posted' before
-- touching these), but this makes it impossible at the DB level as well.
alter table invoices add constraint invoices_draft_facts_check
  check (status <> 'draft' or (amount_paid = 0 and voided_at is null and paid_date is null));
