-- ============================================================================
-- finance-ids — initial schema
-- Source of truth: docs/erd.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Enums
-- ----------------------------------------------------------------------------

create type client_type as enum ('government', 'private');

create type product_line as enum ('VIANA', 'ORION', 'AIoT', 'Indi AI', '3D Digital Twin');

create type expense_category as enum ('payroll', 'operations', 'project_costs');

create type user_role as enum ('superadmin', 'admin', 'director', 'member');

create type entity_type as enum (
  'invoice',
  'project',
  'expense',
  'category_budget',
  'revenue_target',
  'cash_snapshot',
  'page'
);

-- ----------------------------------------------------------------------------
-- 2. Tables
-- ----------------------------------------------------------------------------

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  client_type client_type not null,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete restrict,
  name text not null,
  product_line product_line not null,
  contract_value bigint not null check (contract_value >= 0),
  budget bigint check (budget is null or budget >= 0),
  is_flagged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, name)
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  project_id uuid not null references projects (id) on delete restrict,
  amount bigint not null check (amount > 0),
  amount_paid bigint not null default 0,
  issued_date date not null,
  due_date date not null check (due_date >= issued_date),
  paid_date date,
  voided_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount_paid >= 0 and amount_paid <= amount),
  check (not (paid_date is not null and voided_at is not null)),
  check (paid_date is null or amount_paid = amount),
  check (voided_at is null or amount_paid = 0)
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  category expense_category not null,
  project_id uuid references projects (id) on delete restrict,
  description text not null,
  amount bigint not null check (amount > 0),
  spent_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((category = 'project_costs') = (project_id is not null))
);

create table category_budgets (
  id uuid primary key default gen_random_uuid(),
  category expense_category not null,
  period date not null check (period = date_trunc('month', period)::date),
  planned_amount bigint not null check (planned_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, period)
);

create table revenue_targets (
  id uuid primary key default gen_random_uuid(),
  period date not null unique check (period = date_trunc('month', period)::date),
  target_amount bigint not null check (target_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cash_snapshots (
  id uuid primary key default gen_random_uuid(),
  as_of date not null unique,
  amount bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- id intentionally equals auth.users.id (Supabase Auth's own table) — this is
-- the standard "one profile row per auth user" pattern, not part of the
-- financial chain, so it uses CASCADE rather than the RESTRICT below:
-- deleting an auth user should delete its profile, there's no "financial
-- fact" reason to block that.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role user_role not null default 'member',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete restrict,
  entity entity_type not null,
  entity_id uuid,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No updated_at: audit rows are append-only and never edited.
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete restrict,
  action text not null,
  entity entity_type not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. Indexes (FK columns Postgres doesn't index automatically)
-- ----------------------------------------------------------------------------

create index projects_client_id_idx on projects (client_id);
create index invoices_project_id_idx on invoices (project_id);
create index invoices_issued_date_idx on invoices (issued_date);
create index expenses_project_id_idx on expenses (project_id);
create index expenses_category_spent_on_idx on expenses (category, spent_on);
create index notes_author_id_idx on notes (author_id);
create index audit_log_user_id_idx on audit_log (user_id);

-- ----------------------------------------------------------------------------
-- 4. updated_at trigger — one shared function, applied per editable table
-- ----------------------------------------------------------------------------

create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on projects
  for each row execute function set_updated_at();
create trigger set_updated_at before update on invoices
  for each row execute function set_updated_at();
create trigger set_updated_at before update on expenses
  for each row execute function set_updated_at();
create trigger set_updated_at before update on category_budgets
  for each row execute function set_updated_at();
create trigger set_updated_at before update on revenue_targets
  for each row execute function set_updated_at();
create trigger set_updated_at before update on cash_snapshots
  for each row execute function set_updated_at();
create trigger set_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger set_updated_at before update on notes
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Row Level Security — enabled everywhere, zero policies (deny-all).
-- The backend is the only client and connects with the service_role key,
-- which bypasses RLS entirely. There is no anon/authenticated policy yet
-- because there is no authenticated frontend traffic to the database —
-- authorization lives in Express middleware against `profiles.role`
-- (see .scratch/user-management/PRD.md).
-- ----------------------------------------------------------------------------

alter table clients enable row level security;
alter table projects enable row level security;
alter table invoices enable row level security;
alter table expenses enable row level security;
alter table category_budgets enable row level security;
alter table revenue_targets enable row level security;
alter table cash_snapshots enable row level security;
alter table profiles enable row level security;
alter table notes enable row level security;
alter table audit_log enable row level security;
