import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "./session-cookie";
import {
  BudgetsResponse,
  DashboardResponse,
  InvoicesResponse,
  NotesResponse,
  ProjectsResponse,
  TrendsResponse,
} from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

async function getJson<T>(path: string): Promise<T> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (res.status === 401) redirect("/login");
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

export function getProjects(): Promise<ProjectsResponse> {
  return getJson<ProjectsResponse>("/api/projects");
}

/** `scope`: omit for this month, "all" for all time, or "YYYY-MM-01" for a past month. */
export function getBudgets(scope?: string): Promise<BudgetsResponse> {
  const query = scope ? `?scope=${encodeURIComponent(scope)}` : "";
  return getJson<BudgetsResponse>(`/api/budgets${query}`);
}

export function getTrends(): Promise<TrendsResponse> {
  return getJson<TrendsResponse>("/api/trends");
}

export function getNotes(): Promise<NotesResponse> {
  return getJson<NotesResponse>("/api/notes");
}
