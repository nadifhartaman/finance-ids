"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/ui/table";
import { Chip } from "@/components/ui/chip";
import { Pagination } from "@/components/ui/pagination";
import type { ExpenseDocument } from "@/lib/types";
import { formatDate, formatRupiah } from "@/lib/format";
import { APP_ROUTES, expenseRoute } from "@/lib/routes";
import { CATEGORY_LABELS, statusDisplay } from "./ExpenseTable";

const ROWS_PER_PAGE = 5;
// Caps the pager to 5 pages — getExpenses() can return up to 100 rows,
// and the rest are one click away via "See all expenses".
const MAX_ROWS = 25;

export default function RecentExpenses({
  expenses,
  canWrite = false,
}: {
  expenses: ExpenseDocument[];
  canWrite?: boolean;
}) {
  const [page, setPage] = useState(1);
  const recent = expenses.slice(0, MAX_ROWS);

  const pageCount = Math.max(1, Math.ceil(recent.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = recent.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE,
  );

  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-title">Recent expenses</h2>
        <div className="flex items-center gap-3">
          {canWrite && (
            <Link
              href={APP_ROUTES.newExpense}
              className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              New expense
            </Link>
          )}
          <Link
            href={APP_ROUTES.expenses}
            className="text-sm font-medium text-primary-700 hover:underline"
          >
            See all expenses →
          </Link>
        </div>
      </div>

      <div className="mt-4">
        <TableRoot>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="sr-only">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  No expenses recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((expense) => {
                const status = statusDisplay(expense);
                return (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.spentOn)}</TableCell>
                    <TableCell>
                      <p className="font-medium text-title">{expense.partnerName ?? "—"}</p>
                      <p className="text-xs text-ink-muted">{expense.description}</p>
                    </TableCell>
                    <TableCell>{CATEGORY_LABELS[expense.category]}</TableCell>
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
        </TableRoot>
      </div>

      <Pagination
        page={currentPage}
        pageCount={pageCount}
        total={recent.length}
        pageSize={ROWS_PER_PAGE}
        itemLabel="expenses"
        onPageChange={setPage}
      />
    </div>
  );
}
