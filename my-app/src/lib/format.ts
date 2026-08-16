/**
 * Indonesian short-scale money label: M = miliar (billion), jt = juta (million).
 */
export function formatRupiah(amount: number): string {
  if (amount >= 1_000_000_000) {
    const v = amount / 1_000_000_000;
    return `Rp ${v.toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  }
  const v = amount / 1_000_000;
  return `Rp ${v.toLocaleString("id-ID", { maximumFractionDigits: 0 })} jt`;
}

/** Full-precision Rupiah — for the accounting dashboard, where exact ledger figures matter and "Rp 0 jt" would hide anything under a million. */
export function formatRupiahExact(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
