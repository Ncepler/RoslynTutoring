"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/availability", label: "My hours" },
  { href: "/admin/tests", label: "Tests" },
  { href: "/admin/subjects", label: "Subjects" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/reports", label: "Reports" },
];

export function AdminNav({ openReports }: { openReports: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="flex gap-1">
        {ITEMS.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? "bg-ink text-bg" : "text-ink-2 hover:bg-bg-subtle hover:text-ink"
                }`}
              >
                {item.label}
                {item.href === "/admin/reports" && openReports > 0 && (
                  <span className="tabular grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[0.6875rem] font-bold text-white">
                    {openReports}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
