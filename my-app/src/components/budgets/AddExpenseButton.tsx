"use client";

import { useState } from "react";
import ExpenseFormDialog from "./ExpenseFormDialog";
import type { ProjectOption } from "@/lib/types";

/** admin+ affordance (`spending.write`): opens the "Add expense" dialog. */
export default function AddExpenseButton({ projects }: { projects: ProjectOption[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
      >
        Add expense
      </button>
      <ExpenseFormDialog key={String(isOpen)} isOpen={isOpen} onOpenChange={setIsOpen} projects={projects} />
    </>
  );
}
