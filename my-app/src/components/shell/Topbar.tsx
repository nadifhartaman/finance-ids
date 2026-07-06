import type { AppUser } from "@/lib/roles";
import { BellIcon, SearchIcon } from "./icons";
import UserMenu from "./UserMenu";

export default function Topbar({ user }: { user: AppUser }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-card-border bg-card px-4 py-3 sm:px-6">
      <label className="flex w-full max-w-md items-center gap-2.5 rounded-lg border border-card-border px-3 py-2 text-sm text-ink-muted focus-within:border-primary-300">
        <SearchIcon className="size-4 shrink-0" />
        <input
          type="search"
          placeholder="Search invoices, budgets…"
          className="w-full bg-transparent text-foreground outline-none placeholder:text-ink-muted"
        />
        <kbd className="rounded border border-card-border px-1.5 py-0.5 font-sans text-xs text-ink-muted">
          ⌘K
        </kbd>
      </label>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg border border-card-border p-2 text-ink-secondary hover:bg-soft"
        >
          <BellIcon className="size-5" />
          <span className="absolute top-1.5 right-2 size-2 rounded-full bg-chip-error-icon ring-2 ring-card" />
        </button>
        <UserMenu user={user} />
      </div>
    </header>
  );
}
