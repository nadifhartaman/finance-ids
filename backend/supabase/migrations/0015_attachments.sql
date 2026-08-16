-- ============================================================================
-- finance-ids — generic attachments (nota / invoice proof)
--
-- No document (expense, invoice, or manual journal entry) has anywhere to
-- attach proof today — no table, no Storage bucket. entity_type is a text
-- check, not an enum, deliberately: adding 'invoice' or 'journal_entry'
-- support later must not require its own migration. See
-- help-me-plan-for-foamy-bird.md Phase B.
-- ============================================================================

create table attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('expense', 'invoice', 'journal_entry')),
  entity_id uuid not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  uploaded_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index attachments_entity_idx on attachments (entity_type, entity_id);

-- RLS deny-all, same as every other table — the backend talks to Postgres
-- only via the service-role key.
alter table attachments enable row level security;

insert into storage.buckets (id, name, public)
  values ('documents', 'documents', false)
  on conflict (id) do nothing;
