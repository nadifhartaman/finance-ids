-- ============================================================================
-- finance-ids — seed data
-- Adapted from my-app/src/lib/mock-data.ts. See docs/erd.md's mapping table.
--
-- Where this deliberately differs from the old hand-typed mock:
--   - 3 invoices referenced projects that don't exist in the mock's own
--     projects list ("AIoT – Bapenda ID", "3D Digital Twin – Depot",
--     "ORION – Data Platform" — the mock's invoices and projects arrays were
--     never cross-checked against each other). Reassigned to the closest
--     real project for the same client — see the comments on INV-2026-002,
--     -010, -015 below.
--   - Every other derived number (Project.billedToDate, the Trends monthly
--     chart, operating profit) is left to fall out of these real rows rather
--     than forced to match the old mock exactly — the mock's own hand-typed
--     numbers didn't agree with each other (e.g. a project's stated
--     billedToDate didn't match the sum of its own invoices), so hitting
--     all of them at once isn't possible. The one exception is June: expense
--     amounts are sized to reproduce the mock's June category/project totals,
--     since "this month" is the dashboard's headline period.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Clients (7 — Pertamina is the only private/B2B client, per root CLAUDE.md)
-- ----------------------------------------------------------------------------

insert into clients (name, client_type) values
  ('Bapenda', 'government'),
  ('Dishub', 'government'),
  ('Diskominfo', 'government'),
  ('Komdigi', 'government'),
  ('Kemenperin', 'government'),
  ('RSUD Hasan Sadikin', 'government'),
  ('Pertamina', 'private');

-- ----------------------------------------------------------------------------
-- Projects (12)
-- ----------------------------------------------------------------------------

insert into projects (client_id, name, product_line, contract_value, budget, is_flagged) values
  ((select id from clients where name = 'Dishub'), 'VIANA – Dishub', 'VIANA', 1200000000, 850000000, false),
  ((select id from clients where name = 'Pertamina'), 'ORION – Refinery Sensors', 'ORION', 1000000000, 900000000, false),
  ((select id from clients where name = 'Bapenda'), 'Indi AI Rollout', 'Indi AI', 1500000000, 500000000, false),
  ((select id from clients where name = 'Diskominfo'), '3D Digital Twin – City Center', '3D Digital Twin', 1600000000, 700000000, false),
  ((select id from clients where name = 'RSUD Hasan Sadikin'), 'AIoT – Patient ID', 'AIoT', 900000000, 400000000, false),
  ((select id from clients where name = 'Dishub'), 'VIANA – Traffic Analytics', 'VIANA', 1800000000, null, false),
  ((select id from clients where name = 'Kemenperin'), 'ORION – Factory Monitoring', 'ORION', 1600000000, null, false),
  ((select id from clients where name = 'Pertamina'), 'AIoT – Fleet Tracking', 'AIoT', 1900000000, null, false),
  ((select id from clients where name = 'RSUD Hasan Sadikin'), '3D Digital Twin – Hospital Wing', '3D Digital Twin', 1400000000, null, false),
  ((select id from clients where name = 'Diskominfo'), 'ORION – City Sensors', 'ORION', 1500000000, null, false),
  ((select id from clients where name = 'Komdigi'), 'AIoT – Smart ID', 'AIoT', 800000000, null, false),
  ((select id from clients where name = 'Kemenperin'), 'VIANA – Factory Safety', 'VIANA', 3500000000, null, false);

-- Note: nobody is manually flagged yet (is_flagged = false everywhere) — the
-- Director hasn't reviewed anything in this fresh system. VIANA – Dishub
-- still shows up as "over budget" on the Projects page because that health
-- is DERIVED from budget vs. spent, not from this manual flag.

-- ----------------------------------------------------------------------------
-- Invoices (25 — same amounts/dates as the mock; 3 reassigned to a real
-- project; paid invoices get amount_paid = amount and a paid_date)
--
-- The `(select id from projects where name = ...)` lookups below rely on
-- project names being unique in THIS seed data — the schema itself only
-- guarantees uniqueness per client (see 0001_init.sql), so don't copy this
-- lookup pattern once two clients can share a project name.
-- ----------------------------------------------------------------------------

insert into invoices (invoice_number, project_id, amount, amount_paid, issued_date, due_date, paid_date) values
  ('INV-2026-001', (select id from projects where name = 'VIANA – Dishub'), 480000000, 0, '2026-03-10', '2026-03-25', null),
  -- was "AIoT – Bapenda ID" in the mock — that project was never in the
  -- projects list; reassigned to Indi AI Rollout, Bapenda's real project.
  ('INV-2026-002', (select id from projects where name = 'Indi AI Rollout'), 390000000, 0, '2026-03-18', '2026-04-02', null),
  ('INV-2026-003', (select id from projects where name = 'Indi AI Rollout'), 330000000, 0, '2026-03-22', '2026-04-06', null),
  ('INV-2026-004', (select id from projects where name = 'ORION – Refinery Sensors'), 850000000, 0, '2026-06-01', '2026-06-18', null),
  ('INV-2026-005', (select id from projects where name = '3D Digital Twin – City Center'), 430000000, 0, '2026-06-15', '2026-07-15', null),
  ('INV-2026-006', (select id from projects where name = 'AIoT – Patient ID'), 210000000, 0, '2026-06-20', '2026-07-20', null),
  ('INV-2026-007', (select id from projects where name = 'VIANA – Traffic Analytics'), 610000000, 610000000, '2026-03-02', '2026-03-17', '2026-03-15'),
  ('INV-2026-008', (select id from projects where name = 'Indi AI Rollout'), 720000000, 720000000, '2026-03-10', '2026-03-25', '2026-03-22'),
  ('INV-2026-009', (select id from projects where name = 'ORION – Factory Monitoring'), 540000000, 540000000, '2026-04-01', '2026-04-16', '2026-04-14'),
  -- was "3D Digital Twin – Depot" for client Pertamina in the mock — no such
  -- project exists for Pertamina; reassigned to ORION – Refinery Sensors,
  -- Pertamina's real project.
  ('INV-2026-010', (select id from projects where name = 'ORION – Refinery Sensors'), 380000000, 380000000, '2026-04-12', '2026-04-27', '2026-04-25'),
  ('INV-2026-011', (select id from projects where name = 'VIANA – Dishub'), 295000000, 295000000, '2026-04-28', '2026-05-13', '2026-05-10'),
  ('INV-2026-012', (select id from projects where name = 'AIoT – Patient ID'), 245000000, 245000000, '2026-05-02', '2026-05-17', '2026-05-16'),
  ('INV-2026-013', (select id from projects where name = 'Indi AI Rollout'), 505000000, 505000000, '2026-05-05', '2026-05-20', '2026-05-19'),
  ('INV-2026-014', (select id from projects where name = '3D Digital Twin – City Center'), 615000000, 615000000, '2026-05-08', '2026-05-23', '2026-05-21'),
  -- was "ORION – Data Platform" for client Komdigi in the mock — no such
  -- project exists for Komdigi; reassigned to AIoT – Smart ID, Komdigi's
  -- real project.
  ('INV-2026-015', (select id from projects where name = 'AIoT – Smart ID'), 460000000, 460000000, '2026-05-11', '2026-05-26', '2026-05-24'),
  ('INV-2026-016', (select id from projects where name = 'VIANA – Factory Safety'), 355000000, 355000000, '2026-05-14', '2026-05-29', '2026-05-27'),
  ('INV-2026-017', (select id from projects where name = 'AIoT – Fleet Tracking'), 675000000, 675000000, '2026-05-18', '2026-06-02', '2026-06-01'),
  ('INV-2026-018', (select id from projects where name = 'Indi AI Rollout'), 310000000, 310000000, '2026-05-20', '2026-06-04', '2026-06-03'),
  ('INV-2026-019', (select id from projects where name = '3D Digital Twin – Hospital Wing'), 420000000, 420000000, '2026-05-22', '2026-06-06', '2026-06-05'),
  ('INV-2026-020', (select id from projects where name = 'ORION – City Sensors'), 590000000, 590000000, '2026-05-25', '2026-06-09', '2026-06-08'),
  ('INV-2026-021', (select id from projects where name = 'VIANA – Traffic Analytics'), 265000000, 265000000, '2026-05-28', '2026-06-12', '2026-06-10'),
  ('INV-2026-022', (select id from projects where name = 'AIoT – Smart ID'), 515000000, 515000000, '2026-06-02', '2026-06-17', '2026-06-15'),
  ('INV-2026-023', (select id from projects where name = 'Indi AI Rollout'), 385000000, 385000000, '2026-06-05', '2026-06-20', '2026-06-18'),
  ('INV-2026-024', (select id from projects where name = 'ORION – Refinery Sensors'), 705000000, 705000000, '2026-06-08', '2026-06-23', '2026-06-21'),
  ('INV-2026-025', (select id from projects where name = '3D Digital Twin – City Center'), 340000000, 340000000, '2026-06-12', '2026-06-27', '2026-06-24');

-- ----------------------------------------------------------------------------
-- Expenses
--
-- The mock never listed individual expense rows, only totals (June category
-- spent, and cumulative spent for 5 of the 12 projects). These rows are
-- invented to produce those totals: Jan–May payroll/operations are plausible
-- fill-in (the mock gave no target for those months), while June
-- payroll/operations and every project_costs row are sized to reproduce the
-- mock's numbers exactly.
-- ----------------------------------------------------------------------------

-- Payroll (no project — company-wide)
insert into expenses (category, description, amount, spent_on) values
  ('payroll', 'January payroll', 1280000000, '2026-01-31'),
  ('payroll', 'February payroll', 1290000000, '2026-02-28'),
  ('payroll', 'March payroll', 1300000000, '2026-03-31'),
  ('payroll', 'April payroll', 1320000000, '2026-04-30'),
  ('payroll', 'May payroll', 1340000000, '2026-05-31'),
  ('payroll', 'June payroll', 1350000000, '2026-06-30');

-- Operations (no project — company-wide overhead)
insert into expenses (category, description, amount, spent_on) values
  ('operations', 'January operations', 600000000, '2026-01-31'),
  ('operations', 'February operations', 610000000, '2026-02-28'),
  ('operations', 'March operations', 630000000, '2026-03-31'),
  ('operations', 'April operations', 650000000, '2026-04-30'),
  ('operations', 'May operations', 670000000, '2026-05-31'),
  ('operations', 'June operations', 702000000, '2026-06-30');

-- Project costs — VIANA – Dishub (cumulative 1,020,000,000)
insert into expenses (category, project_id, description, amount, spent_on) values
  ('project_costs', (select id from projects where name = 'VIANA – Dishub'), 'March project costs', 200000000, '2026-03-31'),
  ('project_costs', (select id from projects where name = 'VIANA – Dishub'), 'April project costs', 250000000, '2026-04-30'),
  ('project_costs', (select id from projects where name = 'VIANA – Dishub'), 'May project costs', 270000000, '2026-05-31'),
  ('project_costs', (select id from projects where name = 'VIANA – Dishub'), 'June project costs', 300000000, '2026-06-30');

-- Project costs — ORION – Refinery Sensors (cumulative 702,000,000)
insert into expenses (category, project_id, description, amount, spent_on) values
  ('project_costs', (select id from projects where name = 'ORION – Refinery Sensors'), 'March project costs', 150000000, '2026-03-31'),
  ('project_costs', (select id from projects where name = 'ORION – Refinery Sensors'), 'April project costs', 200000000, '2026-04-30'),
  ('project_costs', (select id from projects where name = 'ORION – Refinery Sensors'), 'May project costs', 202000000, '2026-05-31'),
  ('project_costs', (select id from projects where name = 'ORION – Refinery Sensors'), 'June project costs', 150000000, '2026-06-30');

-- Project costs — Indi AI Rollout (cumulative 460,000,000)
insert into expenses (category, project_id, description, amount, spent_on) values
  ('project_costs', (select id from projects where name = 'Indi AI Rollout'), 'March project costs', 100000000, '2026-03-31'),
  ('project_costs', (select id from projects where name = 'Indi AI Rollout'), 'April project costs', 120000000, '2026-04-30'),
  ('project_costs', (select id from projects where name = 'Indi AI Rollout'), 'May project costs', 120000000, '2026-05-31'),
  ('project_costs', (select id from projects where name = 'Indi AI Rollout'), 'June project costs', 120000000, '2026-06-30');

-- Project costs — 3D Digital Twin – City Center (cumulative 385,000,000)
insert into expenses (category, project_id, description, amount, spent_on) values
  ('project_costs', (select id from projects where name = '3D Digital Twin – City Center'), 'March project costs', 80000000, '2026-03-31'),
  ('project_costs', (select id from projects where name = '3D Digital Twin – City Center'), 'April project costs', 100000000, '2026-04-30'),
  ('project_costs', (select id from projects where name = '3D Digital Twin – City Center'), 'May project costs', 115000000, '2026-05-31'),
  ('project_costs', (select id from projects where name = '3D Digital Twin – City Center'), 'June project costs', 90000000, '2026-06-30');

-- Project costs — AIoT – Patient ID (cumulative 340,000,000)
insert into expenses (category, project_id, description, amount, spent_on) values
  ('project_costs', (select id from projects where name = 'AIoT – Patient ID'), 'March project costs', 70000000, '2026-03-31'),
  ('project_costs', (select id from projects where name = 'AIoT – Patient ID'), 'April project costs', 100000000, '2026-04-30'),
  ('project_costs', (select id from projects where name = 'AIoT – Patient ID'), 'May project costs', 110000000, '2026-05-31'),
  ('project_costs', (select id from projects where name = 'AIoT – Patient ID'), 'June project costs', 60000000, '2026-06-30');

-- ----------------------------------------------------------------------------
-- Category budgets — planned spend for June (the current period; the mock
-- never gave a plan for earlier months)
-- ----------------------------------------------------------------------------

insert into category_budgets (category, period, planned_amount) values
  ('payroll', '2026-06-01', 1400000000),
  ('operations', '2026-06-01', 650000000),
  ('project_costs', '2026-06-01', 900000000);

-- ----------------------------------------------------------------------------
-- Revenue targets (Jan–Jun 2026, straight from the mock — these are leadership
-- inputs, not derived from anything, so there's no reconciliation to do)
-- ----------------------------------------------------------------------------

insert into revenue_targets (period, target_amount) values
  ('2026-01-01', 2800000000),
  ('2026-02-01', 3000000000),
  ('2026-03-01', 3200000000),
  ('2026-04-01', 3400000000),
  ('2026-05-01', 3600000000),
  ('2026-06-01', 4000000000);

-- ----------------------------------------------------------------------------
-- Cash snapshots (matches the mock's "+ Rp 400 jt vs last month" delta)
-- ----------------------------------------------------------------------------

insert into cash_snapshots (as_of, amount) values
  ('2026-05-31', 7800000000),
  ('2026-06-30', 8200000000);

-- No profiles / notes / audit_log rows — auth phase, not this one.
