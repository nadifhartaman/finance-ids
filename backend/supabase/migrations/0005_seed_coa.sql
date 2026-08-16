-- ============================================================================
-- finance-ids — chart of accounts, journals, and settings mappings
--
-- This is configuration, not demo data (unlike supabase/seed.sql) — it ships
-- in a migration because the posting engine (backend/src/lib/accounting/)
-- depends on these rows existing, by key, in every environment.
--
-- Posting code resolves accounts via `accounting_settings.key`, never a
-- hardcoded account id or code — renaming an account or renumbering the COA
-- never requires a code change.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Chart of accounts (Indonesian 6-digit convention)
-- ----------------------------------------------------------------------------

insert into accounts (code, name, type, subtype) values
  -- 1. ASSET
  ('111100', 'Bank BCA',                  'asset',     'bank'),
  ('111200', 'Bank Mandiri',              'asset',     'bank'),
  ('111300', 'Petty Cash',                'asset',     'cash'),
  ('112100', 'Accounts Receivable',       'asset',     'receivable'),
  ('113100', 'Prepaid PPh 23',            'asset',     'prepaid'),
  ('121100', 'Equipment',                 'asset',     'fixed_asset'),
  -- 2. LIABILITY
  ('211100', 'Accounts Payable',          'liability', 'payable'),
  ('212100', 'Payroll Payable',           'liability', 'payroll_payable'),
  ('213100', 'PPN Keluaran (VAT Output)', 'liability', 'tax_payable'),
  ('214100', 'Interest Payable',          'liability', 'other_current_liability'),
  ('221100', 'Bank Loan',                 'liability', 'loan'),
  ('222100', 'Other Debt',                'liability', 'loan'),
  -- 3. EQUITY
  ('311100', 'Owner Capital',             'equity',    'capital'),
  ('312100', 'Retained Earnings',         'equity',    'retained_earnings'),
  ('319100', 'Opening Balance Equity',    'equity',    'opening_balance'),
  -- 4. REVENUE
  ('411100', 'Project Revenue',           'revenue',   'operating_revenue'),
  ('419100', 'Other Revenue',             'revenue',   'other_revenue'),
  -- 5. EXPENSE
  ('511100', 'Project Cost',              'expense',   'project_cost'),
  ('521100', 'Payroll',                   'expense',   'payroll_expense'),
  ('522100', 'Operational Expense',       'expense',   'operating_expense'),
  ('531100', 'Interest Expense',          'expense',   'financial_expense');

-- ----------------------------------------------------------------------------
-- 2. Journals
-- ----------------------------------------------------------------------------

insert into journals (code, name, type, default_account_id) values
  ('SAL',  'Sales',        'sale',     null),
  ('PUR',  'Purchase',     'purchase', null),
  ('BNK1', 'Bank BCA',     'bank',     (select id from accounts where code = '111100')),
  ('BNK2', 'Bank Mandiri', 'bank',     (select id from accounts where code = '111200')),
  ('CSH',  'Cash',         'cash',     (select id from accounts where code = '111300')),
  ('PAY',  'Payroll',      'payroll',  null),
  ('GEN',  'General',      'general',  null);

-- ----------------------------------------------------------------------------
-- 3. Settings — account mappings the posting engine resolves by key
-- ----------------------------------------------------------------------------

insert into accounting_settings (key, account_id) values
  ('ar_account',            (select id from accounts where code = '112100')),
  ('ap_account',             (select id from accounts where code = '211100')),
  ('default_bank',           (select id from accounts where code = '111100')),
  ('default_cash',           (select id from accounts where code = '111300')),
  ('revenue_project',        (select id from accounts where code = '411100')),
  ('revenue_other',          (select id from accounts where code = '419100')),
  ('expense_payroll',        (select id from accounts where code = '521100')),
  ('expense_operations',     (select id from accounts where code = '522100')),
  ('expense_project_costs',  (select id from accounts where code = '511100')),
  ('payroll_payable',        (select id from accounts where code = '212100')),
  ('interest_expense',       (select id from accounts where code = '531100')),
  ('vat_output',             (select id from accounts where code = '213100')),
  ('wht_prepaid',            (select id from accounts where code = '113100')),
  ('retained_earnings',      (select id from accounts where code = '312100')),
  ('opening_balance_equity', (select id from accounts where code = '319100'));

-- Non-account setting: no fiscal period lock yet.
insert into accounting_settings (key, account_id, value) values ('lock_date', null, null);

-- ----------------------------------------------------------------------------
-- 4. Staff partner — payroll counterparty for the monthly lump-sum expense
-- (see docs/erd.md; per-employee payroll is a deferred upgrade).
-- ----------------------------------------------------------------------------

insert into partners (name, is_customer, is_employee, client_type)
values ('Staff', false, true, null);
