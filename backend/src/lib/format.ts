/**
 * Indonesian short-scale money label: M = miliar (billion), jt = juta
 * (million). Ported from the mock (my-app/src/lib/mock-data.ts) so
 * server-composed sentences read identically to the old UI copy.
 */
export function formatRupiah(amount: number): string {
  if (amount >= 1_000_000_000) {
    const v = amount / 1_000_000_000;
    return `Rp ${v.toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  }
  const v = amount / 1_000_000;
  return `Rp ${v.toLocaleString("id-ID", { maximumFractionDigits: 0 })} jt`;
}

/** "June 2026" — the dashboard's period label. */
export function periodLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "30 June 2026" — the dashboard's as-of label. */
export function asOfLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
