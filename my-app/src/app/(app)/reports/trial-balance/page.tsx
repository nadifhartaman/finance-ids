import AsOfDateInput from "@/components/reports/AsOfDateInput";
import TrialBalanceTable from "@/components/reports/TrialBalanceTable";
import { getTrialBalance } from "@/lib/api";
import { APP_ROUTES } from "@/lib/routes";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function TrialBalancePage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  const { asOf: asOfParam } = await searchParams;
  const asOf = asOfParam ?? todayIso();
  const { accounts } = await getTrialBalance(asOf);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-title">Trial balance</h1>
          <p className="mt-1 text-sm text-ink-secondary">Net balance per account, inception-to-date.</p>
        </div>
        <AsOfDateInput asOf={asOf} basePath={APP_ROUTES.trialBalance} />
      </header>

      <div className="mt-6">
        <TrialBalanceTable accounts={accounts} />
      </div>
    </>
  );
}
