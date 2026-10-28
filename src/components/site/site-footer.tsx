import Link from "next/link";
import { site } from "@/config/site";
import { Wordmark } from "./wordmark";

const LINKS = [
  { href: "/tutors", label: "Tutors" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/contact#report", label: "Report a problem" },
  { href: "/code-of-conduct", label: "Code of conduct" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line pb-[env(safe-area-inset-bottom)]">
      <div className="wrap flex flex-col gap-8 py-12 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col items-start gap-3">
          <Wordmark />
          <a href={`mailto:${site.contactEmail}`} className="link text-sm font-medium">
            {site.contactEmail}
          </a>
        </div>
        <nav aria-label="Footer" className="md:max-w-md">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm md:justify-end">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-ink-2 transition-colors hover:text-ink">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="wrap pb-10 text-xs leading-relaxed text-muted">
        {site.name} is an independent, student-run business. It isn&apos;t a school club and isn&apos;t affiliated with or
        endorsed by the {site.school} School District.
      </div>
    </footer>
  );
}
