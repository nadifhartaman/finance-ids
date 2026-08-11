/**
 * Resolves account ids (by `accounting_settings.key`) and journal ids (by
 * `journals.code`) so posting.ts never hardcodes a uuid — renaming an
 * account, renumbering the COA, or swapping banks never needs a code
 * change. Cached briefly since these rows change rarely; call
 * invalidateAccountingCache() after any write to accounting_settings or
 * journals (mirrors the profileCache pattern in middleware/auth.ts).
 */
import { supabase } from "../supabase.js";
import type { Database } from "../../types/database.js";

type ExpenseCategory = Database["public"]["Enums"]["expense_category"];

const CACHE_TTL_MS = 30_000;

let settingsCache: Map<string, string> | null = null;
let journalsCache: Map<string, string> | null = null;
let loadedAt = 0;

async function ensureLoaded(): Promise<void> {
  if (settingsCache && journalsCache && Date.now() - loadedAt < CACHE_TTL_MS) return;

  const [settingsResult, journalsResult] = await Promise.all([
    supabase.from("accounting_settings").select("key, account_id"),
    supabase.from("journals").select("code, id"),
  ]);
  if (settingsResult.error) throw settingsResult.error;
  if (journalsResult.error) throw journalsResult.error;

  const nextSettings = new Map<string, string>();
  for (const row of settingsResult.data) {
    if (row.account_id) nextSettings.set(row.key, row.account_id);
  }
  settingsCache = nextSettings;
  journalsCache = new Map(journalsResult.data.map((j) => [j.code, j.id]));
  loadedAt = Date.now();
}

export function invalidateAccountingCache(): void {
  settingsCache = null;
  journalsCache = null;
}

/** Resolves an `accounting_settings.key` (e.g. "ar_account") to its mapped account id. */
export async function resolveAccount(key: string): Promise<string> {
  await ensureLoaded();
  const id = settingsCache?.get(key);
  if (!id) throw new Error(`accounting_settings has no account mapped for key "${key}"`);
  return id;
}

/** Resolves a `journals.code` (e.g. "BNK1") to its journal id. */
export async function resolveJournal(code: string): Promise<string> {
  await ensureLoaded();
  const id = journalsCache?.get(code);
  if (!id) throw new Error(`No journal with code "${code}"`);
  return id;
}

/** The accounting_settings key for a given expense category's default expense account. */
export function expenseAccountKey(category: ExpenseCategory): string {
  return `expense_${category}`;
}
