-- ============================================================================
-- finance-ids — payables, payments, and debt
--
-- Adds the pieces the current schema has no room for: a vendor bill can go
-- unpaid (accounts payable), a payment is its own fact with a date and a
-- bank account (not a hand-incremented counter), and a loan is tracked as
-- disbursements/repayments against a liability account rather than folded
-- into a generic "expense" or ignored entirely.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. expenses: vendor-bill capable
--
--   due_date IS NULL     -> cash expense  (Dr Expense / Cr Bank)
--   due_date IS NOT NULL -> vendor bill   (Dr Expense / Cr Accounts Payable),
--                           settled later by a `payments` row
-- ----------------------------------------------------------------------------

alter table expenses
  add column partner_id uuid references partners (id) on delete restrict,
  add column expense_account_id uuid references accounts (id) on delete restrict,
  add column due_date date,
  add column voided_at date;

-- Relax the old "project_id iff project_costs" rule in one direction only:
-- project_costs still requires a project, but operations/payroll may now
-- optionally carry one (a project-attributable operational cost previously
-- had nowhere to go).
alter table expenses drop constraint expenses_check;
alter table expenses
  add constraint expenses_project_required_for_costs
  check (category <> 'project_costs' or project_id is not null);

create index expenses_partner_id_idx on expenses (partner_id) where partner_id is not null;
create index expenses_due_date_idx on expenses (due_date) where due_date is not null;

-- ----------------------------------------------------------------------------
-- 2. payments + payment_allocations
--
-- A payment is a single cash/bank movement; allocations reconcile it against
-- one or more invoices (inbound) or expenses (outbound). This is what makes
-- invoices.amount_paid derivable instead of hand-incremented, and what
-- produces real AR/AP aging and cash flow.
-- ----------------------------------------------------------------------------

create type payment_direction as enum ('inbound', 'outbound');

create table payments (
  id uuid primary key default gen_random_uuid(),
  payment_number text not null unique,
  direction payment_direction not null,
  partner_id uuid not null references partners (id) on delete restrict,
  bank_account_id uuid not null references accounts (id) on delete restrict,
  journal_id uuid not null references journals (id) on delete restrict,
  payment_date date not null,
  amount bigint not null check (amount > 0),
  memo text,
  voided_at date,
  created_by uuid not null references profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments (id) on delete cascade,
  invoice_id uuid references invoices (id) on delete restrict,
  expense_id uuid references expenses (id) on delete restrict,
  amount bigint not null check (amount > 0),
  created_at timestamptz not null default now(),
  check ((invoice_id is not null)::int + (expense_id is not null)::int = 1)
);
-- Total allocated may not exceed the payment amount, and per-document
-- over-allocation (paying more than an invoice's outstanding balance) is
-- guarded in application code (postPayment()) where the outstanding figure
-- is computed — a bare CHECK can't see across rows.

create index payments_partner_id_idx on payments (partner_id);
create index payments_bank_account_id_idx on payments (bank_account_id);
create index payments_journal_id_idx on payments (journal_id);
create index payments_payment_date_idx on payments (payment_date);
create index payment_allocations_payment_id_idx on payment_allocations (payment_id);
create index payment_allocations_invoice_id_idx on payment_allocations (invoice_id) where invoice_id is not null;
create index payment_allocations_expense_id_idx on payment_allocations (expense_id) where expense_id is not null;

create trigger set_updated_at before update on payments
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. loans + loan_transactions
--
-- Outstanding principal is never stored — it is
-- Σ disbursement - Σ principal_repayment, cross-checkable against the
-- balance of `liability_account_id`. `loans.principal_amount` is the
-- contracted figure (a fact about the agreement), not a running balance.
-- ----------------------------------------------------------------------------

create type loan_status as enum ('active', 'settled', 'cancelled');
create type loan_txn_type as enum (
  'disbursement', 'principal_repayment', 'interest_accrual', 'interest_payment', 'fee'
);

create table loans (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  lender_partner_id uuid not null references partners (id) on delete restrict,
  liability_account_id uuid not null references accounts (id) on delete restrict,
  principal_amount bigint not null check (principal_amount > 0),
  interest_rate_pct numeric(6, 3),
  start_date date not null,
  maturity_date date,
  status loan_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (maturity_date is null or maturity_date >= start_date)
);

create table loan_transactions (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans (id) on delete restrict,
  type loan_txn_type not null,
  txn_date date not null,
  amount bigint not null check (amount > 0),
  bank_account_id uuid references accounts (id) on delete restrict,
  created_by uuid not null references profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index loans_lender_partner_id_idx on loans (lender_partner_id);
create index loans_liability_account_id_idx on loans (liability_account_id);
create index loans_status_idx on loans (status);
create index loan_transactions_loan_id_idx on loan_transactions (loan_id);
create index loan_transactions_type_idx on loan_transactions (type);

create trigger set_updated_at before update on loans
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Row Level Security — same deny-all posture as every other table.
-- ----------------------------------------------------------------------------

alter table payments enable row level security;
alter table payment_allocations enable row level security;
alter table loans enable row level security;
alter table loan_transactions enable row level security;
