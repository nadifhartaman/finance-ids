"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchIcon } from "@/components/shell/icons";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/ui/table";
import { Chip, type ChipColor } from "@/components/ui/chip";
import { Pagination } from "@/components/ui/pagination";
import type { ExpenseCategory, ExpenseDocStatus, ExpenseDocument } from "@/lib/types";
import { formatDate, formatRupiah } from "@/lib/format";
import { APP_ROUTES, expenseRoute } from "@/lib/routes";

const ROWS_PER_PAGE = 10;

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  payroll: "Payroll",
  operations: "Operational",
  project_costs: "Project costs",
};

const STATUS_FILTERS: { value: ExpenseDocStatus | "all"; label: string }[] = [
  { value: "all", label: "All status" },
  { value: "draft", label: "Draft" },
  { value: "posted", label: "Posted" },
  { value: "cancelled", label: "Cancelled" },
];

/** Draft/Posted/Cancelled chip — Voided is a display-only overlay on a posted row (voidedAt set), not a real status value. */
export function statusDisplay(expense: ExpenseDocument): { label: string; color: ChipColor } {
  if (expense.voidedAt) return { label: "Voided", color: "error" };
  if (expense.status === "draft") return { label: "Draft", color: "primary" };
  if (expense.status === "cancelled") return { label: "Cancelled", color: "gray" };
  return { label: "Posted", color: "success" };
}

/** paidFromAccountId and dueDate are mutually exclusive (enforced by the backend), so this distinguishes "paid" from "still owed" instead of showing a bare dash for both. */
function paymentDisplay(expense: ExpenseDocument): string {
  if (expense.paidFromAccountName) return `Paid via ${expense.paidFromAccountName}`;
  if (expense.dueDate) return `Unpaid — due ${formatDate(expense.dueDate)}`;
  return "—";
}

export default function ExpenseTable({
  expenses,
  canWrite = false,
  initialCategory,
}: {
  expenses: ExpenseDocument[];
  /** Shows the "New expense" affordance; only passed for roles with `spending.write`. */
  canWrite?: boolean;
  initialCategory?: ExpenseCategory | null;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">(initialCategory ?? "all");
  const [statusFilter, setStatusFilter] = useState<ExpenseDocStatus | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      const matchesSearch =
        q === "" ||
        e.description.toLowerCase().includes(q) ||
        (e.documentNumber ?? "").toLowerCase().includes(q) ||
        (e.partnerName ?? "").toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      const matchesDateFrom = dateFrom === "" || e.spentOn >= dateFrom;
      const matchesDateTo = dateTo === "" || e.spentOn <= dateTo;
      return matchesSearch && matchesCategory && matchesStatus && matchesDateFrom && matchesDateTo;
    });
  }, [expenses, search, categoryFilter, statusFilter, dateFrom, dateTo]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);
  const pageTotal = pageRows.reduce((sum, e) => sum + e.amount, 0);

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-card-border px-3 py-2 text-sm text-ink-muted focus-within:border-primary-300">
          <SearchIcon className="size-4 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Search by description, number, or vendor…"
            className="w-full bg-transparent text-foreground outline-none placeholder:text-ink-muted"
          />
        </label>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value as ExpenseCategory | "all");
            setPage(1);
          }}
          className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm font-medium text-title"
        >
          <option value="all">All lanes</option>
          {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as ExpenseDocStatus | "all");
            setPage(1);
          }}
          className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm font-medium text-title"
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-ink-muted">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm font-medium text-title"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-ink-muted">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm font-medium text-title"
          />
        </label>
        {canWrite && (
          <Link
            href={APP_ROUTES.newExpense}
            className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            New expense
          </Link>
        )}
      </div>

      <div className="mt-4">
        <TableRoot>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="sr-only">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center">
                  No expenses match your search.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((expense) => {
                const status = statusDisplay(expense);
                const isOverdue =
                  !!expense.dueDate &&
                  expense.status === "posted" &&
                  !expense.voidedAt &&
                  new Date(expense.dueDate) < new Date();
                return (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <span className="font-medium text-primary-700">
                        {expense.documentNumber ?? "/"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-title">{expense.partnerName ?? "—"}</p>
                      <p className="text-xs text-ink-muted">{expense.description}</p>
                    </TableCell>
                    <TableCell>{formatDate(expense.spentOn)}</TableCell>
                    <TableCell className={isOverdue ? "font-medium text-chip-error-text" : undefined}>
                      {expense.dueDate ? formatDate(expense.dueDate) : "—"}
                    </TableCell>
                    <TableCell>{CATEGORY_LABELS[expense.category]}</TableCell>
                    <TableCell className={isOverdue ? "font-medium text-chip-error-text" : undefined}>
                      {paymentDisplay(expense)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-title tabular-nums">
                      {formatRupiah(expense.amount)}
                    </TableCell>
                    <TableCell>
                      <Chip color={status.color}>{status.label}</Chip>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Link
                        href={expenseRoute(expense.id)}
                        className="rounded-md px-2 py-0.5 text-xs font-medium text-primary-700 hover:bg-primary-50"
                      >
                        {canWrite ? "Edit" : "View"}
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {pageRows.length > 0 && (
            <tfoot>
              <TableRow>
                <TableCell colSpan={6} className="text-right font-medium text-ink-secondary">
                  Page total
                </TableCell>
                <TableCell className="text-right font-semibold text-title tabular-nums">
                  {formatRupiah(pageTotal)}
                </TableCell>
                <TableCell />
                <TableCell />
              </TableRow>
            </tfoot>
          )}
        </TableRoot>
      </div>

      <Pagination
        page={currentPage}
        pageCount={pageCount}
        total={filtered.length}
        pageSize={ROWS_PER_PAGE}
        itemLabel="expenses"
        onPageChange={setPage}
      />
    </div>
  );
}
