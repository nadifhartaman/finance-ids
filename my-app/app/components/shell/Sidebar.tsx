"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseIcon,
  GridIcon,
  PieIcon,
  ReceiptIcon,
  TrendIcon,
} from "./icons";

const NAV = [
  { href: "/", label: "Dashboard", Icon: GridIcon },
  { href: "/invoices", label: "Invoices", Icon: ReceiptIcon },
  { href: "/trends", label: "Trends", Icon: TrendIcon },
  { href: "/budgets", label: "Budgets", Icon: PieIcon },
  { href: "/projects", label: "Projects", Icon: BriefcaseIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-card-border bg-card md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
          In
        </span>
        <span className="text-lg font-semibold text-title">Indismart</span>
      </div>
      <nav className="flex flex-col gap-1 px-3 pt-2">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-primary-200 bg-primary-50 text-primary-600"
                  : "border-transparent text-ink-secondary hover:bg-soft hover:text-title"
              }`}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
