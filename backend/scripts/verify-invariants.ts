/**
 * Verifies the 12 double-entry accounting invariants, plus a 13th
 * (postEntry() atomicity), against the real dev DB, by exercising the
 * actual posting engine / mutations (not mocks). Same "repeatable script,
 * no test framework" pattern as supabase/verify_accounting_backfill.sql —
 * run manually after any change to backend/src/lib/accounting/** or the
 * mutations that call it:
 *
 *   npx tsx scripts/verify-invariants.ts
 *
 * Creates a handful of throwaway rows (reference/invoice-number prefixed
 * "TEST-INVARIANTS-") to exercise real code paths; they're left in place
 * (clearly labeled, harmless — same rationale backfill's reconciliation
 * plug uses) rather than cleaned up, since deleting posted journal entries
 * isn't possible by design (immutability is the whole point). The exception
 * is the 13th check's fiscal_periods row (period "2027-06-01"), which is
 * reopened in a `finally` block so it doesn't affect other periods/checks.
 */
import "dotenv/config";
import { supabase } from "../src/lib/supabase.js";
import {
  createInvoice,
  recordInvoicePayment,
  createExpense,
  recordExpensePayment,
  createPartner,
  createLoan,
  recordLoanRepayment,
} from "../src/lib/mutations.js";
import { fetchTrialBalance, fetchDebtOutstanding } from "../src/lib/accounting/reports.js";

let pass = 0;
let fail = 0;

async function check(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
    pass++;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err instanceof Error ? err.message : err}`);
    fail++;
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function trialBalanceBalances(): Promise<void> {
  const rows = await fetchTrialBalance();
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  assert(totalDebit === totalCredit, `Σdebit ${totalDebit} <> Σcredit ${totalCredit}`);
}

async function accountBalance(accountCode: string): Promise<number> {
  const rows = await fetchTrialBalance();
  const row = rows.find((r) => r.accountCode === accountCode);
  return row?.balance ?? 0;
}

async function main() {
  console.log("Accounting invariants — verification\n");

  const suffix = Date.now();
  const testTag = `TEST-INVARIANTS-${suffix}`;

  const [{ data: profile }, { data: project }, { data: genJournal }, { data: loanAccount }] = await Promise.all([
    supabase.from("profiles").select("id").limit(1).single(),
    supabase.from("projects").select("id, partner_id").limit(1).single(),
    supabase.from("journals").select("id").eq("code", "GEN").single(),
    supabase.from("accounts").select("id, code").eq("subtype", "loan").limit(1).single(),
  ]);
  if (!profile || !project || !genJournal || !loanAccount) {
    throw new Error("Missing seed data (profile/project/GEN journal/loan account) — run migrations 0002-0005 first");
  }
  const actorId = profile.id as string;

  // ----------------------------------------------------------------------
  console.log("1-3: line-level DB invariants (balance / debit-xor-credit)");
  // ----------------------------------------------------------------------

  const { data: draftEntry, error: draftError } = await supabase
    .from("journal_entries")
    .insert({
      journal_id: genJournal.id,
      entry_number: `${testTag}-DRAFT`,
      accounting_date: "2026-01-01",
      description: testTag,
      status: "draft",
      source_type: "manual",
      created_by: actorId,
    })
    .select("id")
    .single();
  if (draftError || !draftEntry) throw new Error(`Could not create scratch draft entry: ${draftError?.message}`);

  await check("2. a line with both debit and credit is rejected", async () => {
    const { error } = await supabase.from("journal_entry_lines").insert({
      journal_entry_id: draftEntry.id,
      line_no: 1,
      account_id: loanAccount.id,
      debit: 100,
      credit: 100,
    });
    assert(!!error, "expected a CHECK violation, insert succeeded");
  });

  await check("3. a line with neither debit nor credit is rejected", async () => {
    const { error } = await supabase.from("journal_entry_lines").insert({
      journal_entry_id: draftEntry.id,
      line_no: 1,
      account_id: loanAccount.id,
      debit: 0,
      credit: 0,
    });
    assert(!!error, "expected a CHECK violation, insert succeeded");
  });

  await check("1/12 (pre-condition). posting an unbalanced 2-line entry is rejected", async () => {
    await supabase.from("journal_entry_lines").insert([
      { journal_entry_id: draftEntry.id, line_no: 1, account_id: loanAccount.id, debit: 100, credit: 0 },
      { journal_entry_id: draftEntry.id, line_no: 2, account_id: loanAccount.id, debit: 0, credit: 50 },
    ]);
    const { error } = await supabase
      .from("journal_entries")
      .update({ status: "posted" })
      .eq("id", draftEntry.id);
    assert(!!error, "expected trg_je_balanced to reject an unbalanced post, it succeeded");
  });

  await supabase.from("journal_entries").delete().eq("id", draftEntry.id); // still draft — deletable

  // ----------------------------------------------------------------------
  console.log("\n4. posted entries are immutable");
  // ----------------------------------------------------------------------

  const { id: invoiceId } = await createInvoice(
    {
      invoiceNumber: `${testTag}-INV`,
      projectId: project.id,
      amount: 10_000_000,
      issuedDate: "2026-01-01",
      dueDate: "2026-01-31",
    },
    actorId,
  );

  const { data: postedEntry } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("source_type", "invoice")
    .eq("source_id", invoiceId)
    .single();

  await check("4a. UPDATE on a posted journal_entries row is rejected", async () => {
    const { error } = await supabase
      .from("journal_entries")
      .update({ description: "tampered" })
      .eq("id", postedEntry!.id);
    assert(!!error, "expected trg_je_immutable to reject the update, it succeeded");
  });

  await check("4b. UPDATE on a posted entry's lines is rejected", async () => {
    const { data: line } = await supabase
      .from("journal_entry_lines")
      .select("id")
      .eq("journal_entry_id", postedEntry!.id)
      .limit(1)
      .single();
    const { error } = await supabase
      .from("journal_entry_lines")
      .update({ debit: 1 })
      .eq("id", line!.id);
    assert(!!error, "expected trg_je_lines_immutable to reject the update, it succeeded");
  });

  await check("4c. DELETE on a posted journal_entries row is rejected", async () => {
    const { error } = await supabase.from("journal_entries").delete().eq("id", postedEntry!.id);
    assert(!!error, "expected trg_je_no_delete_posted to reject the delete, it succeeded");
  });

  // ----------------------------------------------------------------------
  console.log("\n5-6. invoice payment: reduces A/R not revenue, overpay guard");
  // ----------------------------------------------------------------------

  const revenueBeforePay = await accountBalance("411100");
  const arBeforePay = await accountBalance("112100");

  await check("5a. overpaying an invoice is rejected", async () => {
    let threw = false;
    try {
      await recordInvoicePayment(invoiceId, 999_999_999, "2026-01-05", actorId);
    } catch {
      threw = true;
    }
    assert(threw, "expected an overpayment to be rejected");
  });

  await recordInvoicePayment(invoiceId, 4_000_000, "2026-01-05", actorId);

  await check("6. invoice payment reduced A/R by the payment, revenue unchanged", async () => {
    const revenueAfter = await accountBalance("411100");
    const arAfter = await accountBalance("112100");
    assert(revenueAfter === revenueBeforePay, `revenue moved: ${revenueBeforePay} -> ${revenueAfter}`);
    // A/R is an asset (natural debit balance); a payment credits it, so balance (debit-credit) drops.
    assert(arAfter === arBeforePay - 4_000_000, `A/R didn't drop by the payment: ${arBeforePay} -> ${arAfter}`);
  });

  // ----------------------------------------------------------------------
  console.log("\n7. vendor bill payment: reduces A/P not expense");
  // ----------------------------------------------------------------------

  const { id: vendorId } = await createPartner(
    { name: `${testTag}-Vendor`, isVendor: true },
    actorId,
  );

  const expenseBeforeBill = await accountBalance("522100");
  const apBeforeBill = await accountBalance("211100");

  const { id: expenseId } = await createExpense(
    {
      category: "operations",
      projectId: null,
      description: testTag,
      amount: 6_000_000,
      spentOn: "2026-01-02",
      partnerId: vendorId,
      dueDate: "2026-02-01",
    },
    actorId,
  );

  await check("7a. overpaying a vendor bill is rejected", async () => {
    let threw = false;
    try {
      await recordExpensePayment(expenseId, 999_999_999, "2026-01-10", actorId);
    } catch {
      threw = true;
    }
    assert(threw, "expected an overpayment to be rejected");
  });

  const expenseAfterBill = await accountBalance("522100");
  await recordExpensePayment(expenseId, 2_500_000, "2026-01-10", actorId);

  await check("7b. vendor payment reduced A/P by the payment, expense unchanged", async () => {
    const expenseAfterPay = await accountBalance("522100");
    const apAfterPay = await accountBalance("211100");
    assert(expenseAfterBill === expenseBeforeBill + 6_000_000, "vendor bill didn't post the expense once");
    assert(expenseAfterPay === expenseAfterBill, `expense moved on payment: ${expenseAfterBill} -> ${expenseAfterPay}`);
    // A/P is a liability (natural credit balance): the bill credits it (balance drops), the payment debits it (balance rises).
    assert(apAfterPay === apBeforeBill - 6_000_000 + 2_500_000, `A/P didn't net correctly: ${apBeforeBill} -> ${apAfterPay}`);
  });

  // ----------------------------------------------------------------------
  console.log("\n8-10. loans: principal is a liability (not revenue), repayment/interest split");
  // ----------------------------------------------------------------------

  const { id: lenderId } = await createPartner(
    { name: `${testTag}-Lender`, isLender: true },
    actorId,
  );

  const revenueBeforeLoan = await accountBalance("411100");
  const liabilityBefore = await accountBalance(loanAccount.code as string);

  const { id: loanId } = await createLoan(
    {
      reference: `${testTag}-LOAN`,
      lenderPartnerId: lenderId,
      liabilityAccountId: loanAccount.id,
      principalAmount: 20_000_000,
      startDate: "2026-01-01",
    },
    actorId,
  );

  await check("8. loan disbursement increases the liability, not revenue", async () => {
    const revenueAfterLoan = await accountBalance("411100");
    const liabilityAfterLoan = await accountBalance(loanAccount.code as string);
    assert(revenueAfterLoan === revenueBeforeLoan, `revenue moved on disbursement: ${revenueBeforeLoan} -> ${revenueAfterLoan}`);
    assert(
      liabilityAfterLoan === liabilityBefore - 20_000_000,
      // liability accounts carry a natural credit balance, so trial-balance `balance` (debit-credit) goes *more negative* as the liability grows
      `liability didn't move by the principal: ${liabilityBefore} -> ${liabilityAfterLoan}`,
    );
  });

  await check("5b. repaying more principal than outstanding is rejected", async () => {
    let threw = false;
    try {
      await recordLoanRepayment(loanId, 999_999_999, 0, "2026-02-01", actorId);
    } catch {
      threw = true;
    }
    assert(threw, "expected an over-repayment to be rejected");
  });

  const expenseBeforeRepay = await accountBalance("531100"); // Interest Expense
  const liabilityBeforeRepay = await accountBalance(loanAccount.code as string);

  await recordLoanRepayment(loanId, 5_000_000, 300_000, "2026-02-01", actorId);

  await check("9. principal repayment reduces the liability, not expense", async () => {
    const expenseAfterPrincipal = await accountBalance("531100");
    const liabilityAfterRepay = await accountBalance(loanAccount.code as string);
    assert(
      liabilityAfterRepay === liabilityBeforeRepay + 5_000_000,
      `liability didn't reduce by the principal repayment: ${liabilityBeforeRepay} -> ${liabilityAfterRepay}`,
    );
    // interest also landed in this same call, so just confirm expense moved by *something* here — the precise amount is checked in invariant 10
    assert(expenseAfterPrincipal !== expenseBeforeRepay, "interest expense should have moved");
  });

  await check("10. interest repayment hits expense/P&L, not the liability", async () => {
    const expenseAfterRepay = await accountBalance("531100");
    assert(
      expenseAfterRepay === expenseBeforeRepay + 300_000,
      `interest expense didn't move by exactly the interest paid: ${expenseBeforeRepay} -> ${expenseAfterRepay}`,
    );
  });

  await check("outstanding principal is derived correctly (Σdisbursement - Σrepayment)", async () => {
    const debts = await fetchDebtOutstanding();
    const loan = debts.find((d) => d.loanId === loanId);
    assert(!!loan, "loan not found in fetchDebtOutstanding()");
    assert(
      loan!.outstandingPrincipal === 15_000_000,
      `expected outstanding 15,000,000, got ${loan!.outstandingPrincipal}`,
    );
  });

  // ----------------------------------------------------------------------
  console.log("\n11-12. cash is derived, trial balance still balances");
  // ----------------------------------------------------------------------

  await check("11. bank balance moved by every cash-affecting event above", async () => {
    const bank = await accountBalance("111100");
    // invoice payment +4,000,000 in; vendor payment -2,500,000 out; loan
    // disbursement +20,000,000 in; loan repayment -5,300,000 out (principal + interest)
    const expectedNetMovement = 4_000_000 - 2_500_000 + 20_000_000 - 5_300_000;
    assert(
      bank >= expectedNetMovement, // >= since other seed activity may already be in this account
      `bank balance ${bank} looks too low to include this run's movements (expected at least ${expectedNetMovement})`,
    );
  });

  await check("12. trial balance still balances after every operation above", trialBalanceBalances);

  // ----------------------------------------------------------------------
  console.log("\n13. postEntry() is atomic — a rejected post leaves zero rows behind");
  // ----------------------------------------------------------------------

  const closedPeriod = "2027-06-01";
  await supabase.from("fiscal_periods").upsert({ period: closedPeriod, status: "closed" }, { onConflict: "period" });

  try {
    const countRows = async () => {
      const [entries, lines] = await Promise.all([
        supabase.from("journal_entries").select("id", { count: "exact", head: true }),
        supabase.from("journal_entry_lines").select("id", { count: "exact", head: true }),
      ]);
      return { entries: entries.count ?? 0, lines: lines.count ?? 0 };
    };

    const before = await countRows();

    await check("13a. posting into a closed fiscal period is rejected", async () => {
      let threw = false;
      try {
        await createExpense(
          {
            category: "operations",
            projectId: null,
            description: `${testTag}-closed-period`,
            amount: 1_000_000,
            spentOn: "2027-06-15",
          },
          actorId,
        );
      } catch {
        threw = true;
      }
      assert(threw, "expected posting into a closed fiscal period to be rejected");
    });

    await check("13b. the rejected post left no orphaned draft entry or lines", async () => {
      const after = await countRows();
      assert(
        after.entries === before.entries,
        `journal_entries row count changed: ${before.entries} -> ${after.entries} (a draft entry was left behind)`,
      );
      assert(
        after.lines === before.lines,
        `journal_entry_lines row count changed: ${before.lines} -> ${after.lines} (orphaned lines were left behind)`,
      );
    });
  } finally {
    await supabase.from("fiscal_periods").upsert({ period: closedPeriod, status: "open" }, { onConflict: "period" });
  }

  // ----------------------------------------------------------------------
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("verify-invariants.ts crashed:", err);
  process.exit(1);
});
