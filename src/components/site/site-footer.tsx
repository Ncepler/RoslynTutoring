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
    <footer className="border-t border-rule pb-[env(safe-area-inset-bottom)]">
      <div className="wrap grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <Wordmark />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            One-on-one pre-test review on Zoom, run by {site.school} students for {site.school} students.
          </p>
          <a href={`mailto:${site.contactEmail}`} className="link mt-3 inline-block text-sm font-medium">
            {site.contactEmail}
          </a>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title} className="md:col-span-2 lg:col-span-2">
            <h2 className="t-label font-sans">{col.title}</h2>
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
      <div className="wrap border-t border-line py-6 text-xs leading-relaxed text-muted">
        {site.name} is an independent, student-run business. It isn&apos;t a school club and isn&apos;t affiliated with or
        endorsed by the {site.school} School District.
      </div>
    </footer>
  );
}
