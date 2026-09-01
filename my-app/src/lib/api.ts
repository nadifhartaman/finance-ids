import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchBackend } from "./backend-fetch";
import { SESSION_COOKIE } from "./session-cookie";
import {
  AccountsResponse,
  AgingResponse,
  AttachmentItem,
  BudgetsResponse,
  CashFlowGranularity,
  CashFlowResponse,
  ClientsResponse,
  DashboardResponse,
  DebtResponse,
  ExpenseDocStatus,
  ExpenseDocument,
  ExpenseDocumentsResponse,
  FinancialSummary,
  GeneralLedgerResponse,
  IncomeStatement,
  InvoiceDocument,
  InvoicesResponse,
  JournalEntriesResponse,
  JournalEntryDetail,
  JournalEntryStatus,
  LoanStatus,
  NotesResponse,
  PartnersResponse,
  PlMonthlyResponse,
  ProjectProfitabilityResponse,
  ProjectsResponse,
  TrendsResponse,
  TrialBalanceResponse,
} from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

// Node's fetch has no default timeout, so a stalled backend left every page
// awaiting forever — the shared loading.tsx skeleton would pulse indefinitely
// with no error and no way out. Failing loudly after 15s hands the error to
// error.tsx / SectionBoundary, which is recoverable; hanging is not.
// fetchBackend also retries once on a dropped keep-alive socket and throws
// BackendUnreachableError (not a plain Error) so this is distinguishable
// from a real 401 below — see backend-fetch.ts.
const REQUEST_TIMEOUT_MS = 15_000;

async function getJson<T>(path: string): Promise<T> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const res = await fetchBackend(
    `${API_URL}${path}`,
    { cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : undefined },
    REQUEST_TIMEOUT_MS,
  );
  // /logout (not /login) — clears the stale cookie via a Route Handler so
  // proxy.ts doesn't see it as still-present and bounce straight back,
  // which is what turned a real 401 into an infinite redirect loop before.
  if (res.status === 401) redirect("/logout");
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.statusText}`);
  }
  return res.json();
}

export function getDashboard(): Promise<DashboardResponse> {
  return getJson<DashboardResponse>("/api/dashboard");
}

export function getInvoices(): Promise<InvoicesResponse> {
  return getJson<InvoicesResponse>("/api/invoices");
}

export function getInvoice(id: string): Promise<InvoiceDocument> {
  return getJson<InvoiceDocument>(`/api/invoices/${id}`);
}

export function getProjects(): Promise<ProjectsResponse> {
  return getJson<ProjectsResponse>("/api/projects");
}

export function getClients(): Promise<ClientsResponse> {
  return getJson<ClientsResponse>("/api/clients");
}

/** `scope`: omit for this month, "all" for all time, or "YYYY-MM-01" for a past month. */
export function getBudgets(scope?: string): Promise<BudgetsResponse> {
  const query = scope ? `?scope=${encodeURIComponent(scope)}` : "";
  return getJson<BudgetsResponse>(`/api/budgets${query}`);
}

export function getTrends(): Promise<TrendsResponse> {
  return getJson<TrendsResponse>("/api/trends");
}

/** Fetches every expense document in range in one page — the dataset is small (see backend/CLAUDE.md's performance note), so the table paginates client-side like InvoiceTable. */
export function getExpenses(params?: {
  category?: string;
  status?: ExpenseDocStatus;
}): Promise<ExpenseDocumentsResponse> {
  const qs = new URLSearchParams({ limit: "100" });
  if (params?.category) qs.set("category", params.category);
  if (params?.status) qs.set("status", params.status);
  return getJson<ExpenseDocumentsResponse>(`/api/expenses?${qs.toString()}`);
}

export function getExpense(id: string): Promise<ExpenseDocument> {
  return getJson<ExpenseDocument>(`/api/expenses/${id}`);
}

export function getPartners(role?: "customer" | "vendor" | "employee" | "lender"): Promise<PartnersResponse> {
  const query = role ? `?role=${role}` : "";
  return getJson<PartnersResponse>(`/api/partners${query}`);
}

export function getAccountingAccounts(): Promise<AccountsResponse> {
  return getJson<AccountsResponse>("/api/accounting/accounts");
}

export function getAttachments(entityType: string, entityId: string): Promise<{ attachments: AttachmentItem[] }> {
  return getJson<{ attachments: AttachmentItem[] }>(
    `/api/attachments?entityType=${entityType}&entityId=${entityId}`,
  );
}

export function getNotes(): Promise<NotesResponse> {
  return getJson<NotesResponse>("/api/notes");
}

// ----------------------------------------------------------------------------
// Accounting — reads only; the ledger is the source of truth, these call the
// accounting report endpoints directly rather than deriving figures from
// invoice/expense/project totals.
// ----------------------------------------------------------------------------

// Wrapped in React's per-request cache() — several independent Suspense
// sections on the same page (e.g. Dashboard's Debt card + NeedsAttentionSection)
// need the same report, and without this each one fired its own request.
// Same pattern as auth.ts's getCurrentUser. Dedupes by argument identity
// within one render pass only — it is not a cross-request cache.

export const getAccountingSummary = cache((asOf?: string): Promise<FinancialSummary> => {
  const query = asOf ? `?asOf=${encodeURIComponent(asOf)}` : "";
  return getJson<FinancialSummary>(`/api/accounting/summary${query}`);
});

export const getPlMonthly = cache((from: string, to: string): Promise<PlMonthlyResponse> => {
  const query = new URLSearchParams({ from, to });
  return getJson<PlMonthlyResponse>(`/api/accounting/pl-monthly?${query}`);
});

export const getCashFlow = cache((
  from: string,
  to: string,
  granularity?: CashFlowGranularity,
): Promise<CashFlowResponse> => {
  const query = new URLSearchParams({ from, to });
  if (granularity) query.set("granularity", granularity);
  return getJson<CashFlowResponse>(`/api/accounting/cash-flow?${query}`);
});

export const getProjectProfitability = cache((asOf?: string, limit?: number): Promise<ProjectProfitabilityResponse> => {
  const query = new URLSearchParams();
  if (asOf) query.set("asOf", asOf);
  if (limit) query.set("limit", String(limit));
  const qs = query.toString();
  return getJson<ProjectProfitabilityResponse>(`/api/accounting/project-profitability${qs ? `?${qs}` : ""}`);
});

export const getArAging = cache((asOf?: string): Promise<AgingResponse> => {
  const query = asOf ? `?asOf=${encodeURIComponent(asOf)}` : "";
  return getJson<AgingResponse>(`/api/accounting/ar-aging${query}`);
});

export const getApAging = cache((asOf?: string): Promise<AgingResponse> => {
  const query = asOf ? `?asOf=${encodeURIComponent(asOf)}` : "";
  return getJson<AgingResponse>(`/api/accounting/ap-aging${query}`);
});

export const getDebt = cache((status?: LoanStatus): Promise<DebtResponse> => {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return getJson<DebtResponse>(`/api/accounting/debt${query}`);
});

// ----------------------------------------------------------------------------
// Accounting statements — /reports/* pages. Same read-only, ledger-backed
// pattern as the section above.
// ----------------------------------------------------------------------------

export const getTrialBalance = cache((asOf?: string): Promise<TrialBalanceResponse> => {
  const query = asOf ? `?asOf=${encodeURIComponent(asOf)}` : "";
  return getJson<TrialBalanceResponse>(`/api/accounting/trial-balance${query}`);
});

export const getIncomeStatement = cache((from: string, to: string): Promise<IncomeStatement> => {
  const query = new URLSearchParams({ from, to });
  return getJson<IncomeStatement>(`/api/accounting/income-statement?${query}`);
});

export const getJournalEntries = cache((params?: {
  from?: string;
  to?: string;
  journalCode?: string;
  status?: JournalEntryStatus;
  page?: number;
  limit?: number;
}): Promise<JournalEntriesResponse> => {
  const query = new URLSearchParams();
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.journalCode) query.set("journalCode", params.journalCode);
  if (params?.status) query.set("status", params.status);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return getJson<JournalEntriesResponse>(`/api/accounting/entries${qs ? `?${qs}` : ""}`);
});

export const getJournalEntry = cache((id: string): Promise<JournalEntryDetail> => {
  return getJson<JournalEntryDetail>(`/api/accounting/entries/${id}`);
});

export const getGeneralLedger = cache((params?: {
  accountId?: string;
  accountSubtypes?: string[];
  projectId?: string;
  partnerId?: string;
  from?: string;
  to?: string;
}): Promise<GeneralLedgerResponse> => {
  const query = new URLSearchParams();
  if (params?.accountId) query.set("accountId", params.accountId);
  for (const subtype of params?.accountSubtypes ?? []) query.append("accountSubtype", subtype);
  if (params?.projectId) query.set("projectId", params.projectId);
  if (params?.partnerId) query.set("partnerId", params.partnerId);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  const qs = query.toString();
  return getJson<GeneralLedgerResponse>(`/api/accounting/general-ledger${qs ? `?${qs}` : ""}`);
});
