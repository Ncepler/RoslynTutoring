import Link from "next/link";
import { site } from "@/config/site";
import { Wordmark } from "./wordmark";

const COLUMNS = [
  {
    title: "Tutoring",
    links: [
      { href: "/book", label: "Book a session" },
      { href: "/#tests", label: "Upcoming tests" },
      { href: "/tutors", label: "Tutors" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/contact#report", label: "Report a problem" },
      { href: "/code-of-conduct", label: "Code of conduct" },
    ],
  },
  {
    title: "Policies",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-bg-subtle pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Wordmark />
          <p className="mt-3 text-sm leading-relaxed text-muted">
            One-on-one pre-test review on Zoom, run by {site.school} students for {site.school} students.
          </p>
          <a href={`mailto:${site.contactEmail}`} className="link mt-3 inline-block text-sm">
            {site.contactEmail}
          </a>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="t-label">{col.title}</h2>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-ink-2 transition-colors hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-6xl border-t border-line px-4 py-6 text-xs leading-relaxed text-muted sm:px-6">
        {site.name} is an independent, student-run business. It isn&apos;t a school club and isn&apos;t affiliated with or
        endorsed by the {site.school} School District.
      </div>
    </footer>
  );
}
