import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileMenu } from "./mobile-menu";
import { NAV } from "./nav";
import { Wordmark } from "./wordmark";

export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-40 isolate pt-[env(safe-area-inset-top)]">
      {/* Glass lives on its own layer: backdrop-filter on the header itself would trap the
          mobile menu's fixed scrim inside the header box. */}
      <div aria-hidden="true" className="glass absolute inset-0 -z-10" />
      <div className="mx-auto flex h-[var(--header-h)] max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Wordmark />
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="btn btn-ghost btn-sm font-medium text-ink-2"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <Link href="/book" className="btn btn-primary btn-sm">
            Book a session
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
