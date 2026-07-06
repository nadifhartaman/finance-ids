import {
  BudgetsResponse,
  DashboardResponse,
  InvoicesResponse,
  ProjectsResponse,
  TrendsResponse,
} from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
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

export function getBudgets(): Promise<BudgetsResponse> {
  return getJson<BudgetsResponse>("/api/budgets");
}

export function getTrends(): Promise<TrendsResponse> {
  return getJson<TrendsResponse>("/api/trends");
}
