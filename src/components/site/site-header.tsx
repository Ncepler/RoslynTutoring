import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileMenu } from "./mobile-menu";
import { NAV } from "./nav";
import { Wordmark } from "./wordmark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg pt-[env(safe-area-inset-top)]">
      <div className="wrap flex h-[var(--header-h)] items-center gap-8">
        <Wordmark />
        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-[0.9375rem] font-medium text-ink-2 transition-colors hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
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
