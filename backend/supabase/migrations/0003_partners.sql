-- ============================================================================
-- finance-ids — partners (extends `clients` into a single financial identity)
--
-- `clients` becomes `partners`: a customer, vendor, employee, or lender can
-- all be the same table with role flags, instead of duplicated identity
-- tables. Every existing client row survives untouched (rename + new
-- columns with safe defaults, no data rewritten). A `clients` view keeps
-- `GET /api/clients` and `queries.ts` working unmodified until the frontend
-- picks up the wider partner concept.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. clients -> partners
-- ----------------------------------------------------------------------------

alter table clients rename to partners;

alter table partners
  add column is_customer boolean not null default true,
  add column is_vendor boolean not null default false,
  add column is_employee boolean not null default false,
  add column is_lender boolean not null default false,
  add column is_active boolean not null default true,
  add column tax_id text,
  add column updated_at timestamptz not null default now();

-- client_type (government/private) only means something for customers.
alter table partners alter column client_type drop not null;

alter table partners
  add constraint partners_has_role check (is_customer or is_vendor or is_employee or is_lender);

create trigger set_updated_at before update on partners
  for each row execute function set_updated_at();

-- Every seeded row was a customer (client_type was mandatory pre-migration);
-- the column default already covers this, this is just explicit and future-proof
-- against the default ever changing.
update partners set is_customer = true where is_customer is distinct from true;

-- Backward-compatible read shape for GET /api/clients and queries.ts's
-- fetchClients(), scoped to the customer-facing rows only. Drop once those
-- callers move to `partners` directly.
create view clients as
  select id, name, client_type, created_at
  from partners
  where is_customer;

-- ----------------------------------------------------------------------------
-- 2. projects.client_id -> partner_id (same FK, renamed to match)
-- ----------------------------------------------------------------------------

alter table projects rename column client_id to partner_id;
alter index projects_client_id_idx rename to projects_partner_id_idx;

-- ----------------------------------------------------------------------------
-- 3. invoices: direct partner_id (was a two-hop join through projects),
-- plus tax columns so revenue (DPP) is never conflated with the gross
-- billed amount or the cash actually expected. `amount` keeps meaning the
-- pre-tax revenue figure — unchanged for every existing report.
--
--   total billed  = amount + tax_amount
--   cash expected = amount + tax_amount - withheld_amount
-- ----------------------------------------------------------------------------

alter table invoices
  add column partner_id uuid references partners (id) on delete restrict,
  add column tax_amount bigint not null default 0 check (tax_amount >= 0),
  add column withheld_amount bigint not null default 0 check (withheld_amount >= 0),
  add column description text;

update invoices i
set partner_id = p.partner_id
from projects p
where p.id = i.project_id;

alter table invoices alter column partner_id set not null;
create index invoices_partner_id_idx on invoices (partner_id);

-- ----------------------------------------------------------------------------
-- 4. journal_entry_lines.partner_id -> partners — deferred from
-- 0002_accounting_core.sql because `partners` did not exist yet.
-- ----------------------------------------------------------------------------

alter table journal_entry_lines
  add constraint journal_entry_lines_partner_id_fkey
  foreign key (partner_id) references partners (id) on delete restrict;
