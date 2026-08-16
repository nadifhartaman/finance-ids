-- ============================================================================
-- finance-ids — backfill existing invoices/expenses into the general ledger
--
-- Posts every historical document as a balanced journal entry so the GL
-- becomes a complete record from day one, instead of only covering
-- transactions created after cutover. No existing row is modified — this
-- migration only inserts (journal_entries, journal_entry_lines, payments,
-- payment_allocations).
--
-- Approach (see docs/erd.md / the accounting-core plan for full rationale):
--   1. Opening entry at the cutover date (day before the earliest invoice),
--      with opening cash rolled back from the earliest cash_snapshots row.
--   2. Every non-voided invoice -> Dr A/R / Cr Project Revenue.
--   3. Every invoice with amount_paid > 0 -> a synthesized `payments` row
--      + Dr Bank / Cr A/R. Fully-paid invoices use `paid_date`; a
--      partially-paid invoice with no paid_date (date genuinely unknown —
--      the invoices CHECK constraints only set paid_date on full
--      settlement) is dated at `due_date` and flagged in its memo.
--   4. Every expense -> Dr Expense / Cr Bank (all historical expenses are
--      cash-paid: `due_date` is a brand-new column, null on every existing
--      row, so none of them read as a payable).
--   5. A reconciliation plug against the latest cash_snapshots row, since
--      invoices/expenses were never a complete record of banking activity.
--      Its size is a visible measure of how incomplete the old data was.
--
-- All backfilled cash movement is posted through Bank BCA (111100) — the
-- old schema never recorded which bank account a payment used, so this is
-- a documented simplification, not a discovered fact.
-- ============================================================================

do $$
declare
  v_creator uuid;
  v_sal_journal uuid;
  v_bnk1_journal uuid;
  v_gen_journal uuid;
  v_ar_account uuid;
  v_bank_account uuid;
  v_obe_account uuid;
  v_revenue_account uuid;
  v_seq int;
  v_entry_id uuid;
  inv record;
  exp record;
  v_cutover_date date;
  v_opening_cash bigint := 0;
  v_earliest_snapshot record;
  v_latest_snapshot record;
  v_inflow bigint;
  v_outflow bigint;
  v_derived_bank bigint;
  v_plug bigint;
begin
  if exists (select 1 from journal_entries where source_type = 'invoice') then
    raise notice 'Backfill already appears to have run (invoice-sourced entries exist) — skipping.';
    return;
  end if;

  select id into v_creator from profiles order by created_at asc limit 1;
  if v_creator is null then
    raise exception 'Cannot backfill: no profiles exist to attribute journal entries to';
  end if;

  select id into v_sal_journal from journals where code = 'SAL';
  select id into v_bnk1_journal from journals where code = 'BNK1';
  select id into v_gen_journal from journals where code = 'GEN';
  select account_id into v_ar_account from accounting_settings where key = 'ar_account';
  select account_id into v_bank_account from accounting_settings where key = 'default_bank';
  select account_id into v_obe_account from accounting_settings where key = 'opening_balance_equity';
  select account_id into v_revenue_account from accounting_settings where key = 'revenue_project';

  select (min(issued_date) - 1) into v_cutover_date from invoices where voided_at is null;
  if v_cutover_date is null then
    raise notice 'No invoices found — nothing to backfill.';
    return;
  end if;

  -- ------------------------------------------------------------------------
  -- 1. Opening entry — roll the earliest cash_snapshots row back to the
  -- cutover date through the payments/expenses that fall in between.
  -- ------------------------------------------------------------------------

  select * into v_earliest_snapshot from cash_snapshots order by as_of asc limit 1;

  if v_earliest_snapshot.id is not null then
    select coalesce(sum(amount_paid), 0) into v_inflow
      from invoices
      where paid_date is not null and paid_date > v_cutover_date and paid_date <= v_earliest_snapshot.as_of;
    select coalesce(sum(amount), 0) into v_outflow
      from expenses
      where spent_on > v_cutover_date and spent_on <= v_earliest_snapshot.as_of;
    v_opening_cash := v_earliest_snapshot.amount - v_inflow + v_outflow;
  end if;

  if v_opening_cash <> 0 then
    insert into journal_entries
      (journal_id, entry_number, accounting_date, description, status, source_type, created_by)
    values
      (v_gen_journal, 'GEN-OPENING-0001', v_cutover_date, 'Opening balance — accounting cutover', 'draft', 'manual', v_creator)
    returning id into v_entry_id;

    insert into journal_entry_lines (journal_entry_id, line_no, account_id, debit, credit, description) values
      (v_entry_id, 1, v_bank_account, greatest(v_opening_cash, 0), greatest(-v_opening_cash, 0), 'Opening cash balance'),
      (v_entry_id, 2, v_obe_account, greatest(-v_opening_cash, 0), greatest(v_opening_cash, 0), 'Opening balance equity');

    update journal_entries set status = 'posted', posted_by = v_creator where id = v_entry_id;
  end if;

  -- ------------------------------------------------------------------------
  -- 2/3. Invoices -> Dr A/R / Cr Project Revenue, then the payment (if any).
  -- ------------------------------------------------------------------------

  v_seq := 0;
  for inv in
    select * from invoices where voided_at is null order by issued_date, invoice_number
  loop
    v_seq := v_seq + 1;

    insert into journal_entries
      (journal_id, entry_number, accounting_date, reference, description, status, source_type, source_id, created_by)
    values
      (v_sal_journal, 'SAL/' || to_char(inv.issued_date, 'YYYY') || '/' || lpad(v_seq::text, 4, '0'),
       inv.issued_date, inv.invoice_number, 'Invoice ' || inv.invoice_number, 'draft', 'invoice', inv.id, v_creator)
    returning id into v_entry_id;

    insert into journal_entry_lines (journal_entry_id, line_no, account_id, partner_id, debit, credit, description) values
      (v_entry_id, 1, v_ar_account, inv.partner_id, inv.amount, 0, 'Accounts receivable — ' || inv.invoice_number);
    insert into journal_entry_lines (journal_entry_id, line_no, account_id, project_id, debit, credit, description) values
      (v_entry_id, 2, v_revenue_account, inv.project_id, 0, inv.amount, 'Revenue — ' || inv.invoice_number);

    update journal_entries set status = 'posted', posted_by = v_creator where id = v_entry_id;

    if inv.amount_paid > 0 then
      declare
        v_payment_id uuid;
        v_payment_date date;
        v_memo text;
      begin
        v_payment_date := coalesce(inv.paid_date, inv.due_date);
        v_memo := case when inv.paid_date is null
          then 'BACKFILL — payment date estimated from due date, actual date unrecoverable'
          else null end;

        insert into payments
          (payment_number, direction, partner_id, bank_account_id, journal_id, payment_date, amount, memo, created_by)
        values
          ('PMT-' || inv.invoice_number, 'inbound', inv.partner_id, v_bank_account, v_bnk1_journal,
           v_payment_date, inv.amount_paid, v_memo, v_creator)
        returning id into v_payment_id;

        insert into payment_allocations (payment_id, invoice_id, amount)
        values (v_payment_id, inv.id, inv.amount_paid);

        insert into journal_entries
          (journal_id, entry_number, accounting_date, reference, description, status, source_type, source_id, created_by)
        values
          (v_bnk1_journal, 'BNK1/' || to_char(v_payment_date, 'YYYY') || '/' || lpad(v_seq::text, 4, '0'),
           v_payment_date, inv.invoice_number, 'Payment received — ' || inv.invoice_number, 'draft', 'payment', v_payment_id, v_creator)
        returning id into v_entry_id;

        insert into journal_entry_lines (journal_entry_id, line_no, account_id, debit, credit, description) values
          (v_entry_id, 1, v_bank_account, inv.amount_paid, 0, 'Payment received — ' || inv.invoice_number);
        insert into journal_entry_lines (journal_entry_id, line_no, account_id, partner_id, debit, credit, description) values
          (v_entry_id, 2, v_ar_account, inv.partner_id, 0, inv.amount_paid, 'Settle A/R — ' || inv.invoice_number);

        update journal_entries set status = 'posted', posted_by = v_creator where id = v_entry_id;
      end;
    end if;
  end loop;

  -- ------------------------------------------------------------------------
  -- 4. Expenses -> Dr Expense / Cr Bank (all cash-paid: due_date is a
  -- brand-new column, null on every existing row).
  -- ------------------------------------------------------------------------

  v_seq := 0;
  for exp in
    select * from expenses order by spent_on, id
  loop
    v_seq := v_seq + 1;
    declare
      v_expense_account uuid;
    begin
      select account_id into v_expense_account
        from accounting_settings where key = 'expense_' || exp.category::text;

      insert into journal_entries
        (journal_id, entry_number, accounting_date, description, status, source_type, source_id, created_by)
      values
        (v_bnk1_journal, 'BNK1-EXP/' || to_char(exp.spent_on, 'YYYY') || '/' || lpad(v_seq::text, 4, '0'),
         exp.spent_on, exp.description, 'draft', 'expense', exp.id, v_creator)
      returning id into v_entry_id;

      insert into journal_entry_lines (journal_entry_id, line_no, account_id, project_id, partner_id, debit, credit, description) values
        (v_entry_id, 1, v_expense_account, exp.project_id, exp.partner_id, exp.amount, 0, exp.description);
      insert into journal_entry_lines (journal_entry_id, line_no, account_id, debit, credit, description) values
        (v_entry_id, 2, v_bank_account, 0, exp.amount, 'Cash paid — ' || exp.description);

      update journal_entries set status = 'posted', posted_by = v_creator where id = v_entry_id;
    end;
  end loop;

  -- ------------------------------------------------------------------------
  -- 5. Reconciliation plug against the latest bank statement snapshot.
  -- ------------------------------------------------------------------------

  select * into v_latest_snapshot from cash_snapshots order by as_of desc limit 1;

  if v_latest_snapshot.id is not null then
    select v_opening_cash
      + coalesce((select sum(amount) from payments
                    where bank_account_id = v_bank_account and payment_date <= v_latest_snapshot.as_of), 0)
      - coalesce((select sum(amount) from expenses where spent_on <= v_latest_snapshot.as_of), 0)
      into v_derived_bank;

    v_plug := v_latest_snapshot.amount - v_derived_bank;

    if v_plug <> 0 then
      insert into journal_entries
        (journal_id, entry_number, accounting_date, description, status, source_type, created_by)
      values
        (v_gen_journal, 'GEN-RECONCILE-0001', v_latest_snapshot.as_of,
         'Cutover reconciliation — unrecorded pre-system activity', 'draft', 'manual', v_creator)
      returning id into v_entry_id;

      insert into journal_entry_lines (journal_entry_id, line_no, account_id, debit, credit, description) values
        (v_entry_id, 1, v_bank_account, greatest(v_plug, 0), greatest(-v_plug, 0), 'Reconciliation to bank statement'),
        (v_entry_id, 2, v_obe_account, greatest(-v_plug, 0), greatest(v_plug, 0), 'Reconciliation to bank statement');

      update journal_entries set status = 'posted', posted_by = v_creator where id = v_entry_id;

      raise notice 'Reconciliation plug posted: % (positive = bank increased to match statement)', v_plug;
    else
      raise notice 'No reconciliation plug needed — ledger already matches the latest cash snapshot.';
    end if;
  end if;

  raise notice 'Backfill complete: % invoices, % expenses posted.',
    (select count(*) from invoices where voided_at is null),
    (select count(*) from expenses);
end $$;
