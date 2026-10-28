import Link from "next/link";
import { bookingRules, pricing, site } from "@/config/site";
import { ArrowRight, Video } from "@/components/icons";
import { formatPrice } from "@/lib/booking/policy";
import type { Catalog } from "@/lib/data/catalog";
import { daysBetween, formatLocalDate, relativeDays } from "@/lib/time";
import { HeroStack, type HeroStackProps } from "./hero-stack";

/**
 * Layer stack, bottom to top (all code, no images):
 *   0  graph-paper plane, faded at the edges            (code, static)
 *   1  headline, subcopy, CTAs                           (code, CSS entrance; h1 is the LCP)
 *   2  price card, back of the stack, smallest + softest (code, parallax depth 0.35)
 *   3  tutors card, middle                               (code, parallax depth 0.65)
 *   4  next-test card, front, crisp, deepest shadow      (code, parallax depth 1.0, the signature)
 */
export function Hero({ catalog }: { catalog: Catalog }) {
  const subjectsById = new Map(catalog.subjects.map((s) => [s.id, s]));
  const next = catalog.tests.find((t) => subjectsById.has(t.subjectId));
  const nextSubject = next ? subjectsById.get(next.subjectId) : undefined;

  const stack: HeroStackProps = {
    next:
      next && nextSubject
        ? {
            course: next.course,
            subject: nextSubject.name,
            date: formatLocalDate(next.testDate),
            when: relativeDays(daysBetween(catalog.today, next.testDate)),
            href: `/book?subject=${nextSubject.slug}&test=${next.id}`,
          }
        : null,
    subjects: catalog.subjects.slice(0, 4).map((s) => ({ name: s.name, href: `/book?subject=${s.slug}` })),
    tutors: catalog.tutors.map((t) => ({ first: t.firstName, initials: `${t.firstName[0]}${t.lastName[0]}` })),
    prices: { half: formatPrice(pricing[30]), hour: formatPrice(pricing[60]) },
  };

  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="grid-paper absolute inset-0 -z-10" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-16 sm:px-6 md:pt-14 md:pb-24 lg:grid-cols-[1.3fr_1fr] lg:gap-6">
        <div className="max-w-[40rem]">
          <p
            className="enter inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[0.8125rem] font-medium text-ink-2 shadow-[var(--shadow-sm)]"
            style={{ "--i": 0 } as React.CSSProperties}
          >
            <Video size={15} className="text-accent-text" />
            One-on-one on Zoom · Grades {site.grades[0]} to {site.grades[site.grades.length - 1]}
          </p>
          <h1 className="t-display enter-tf mt-5" style={{ "--i": 1 } as React.CSSProperties}>
            Test coming up?{" "}
            <span className="text-muted">Review with a {site.school} student who&apos;s been there.</span>
          </h1>
          <p className="t-lead enter mt-5 max-w-[34rem]" style={{ "--i": 2 } as React.CSSProperties}>
            Bring your notes and what&apos;s on the test. Your tutor is a {site.school} student who has earned many
            100s on the Regents. {formatPrice(pricing[30])} for 30 minutes, {formatPrice(pricing[60])} for an hour.
          </p>
          <div className="enter mt-8 flex flex-wrap items-center gap-3" style={{ "--i": 3 } as React.CSSProperties}>
            <Link href="/book" className="btn btn-primary btn-lg group">
              Book a review
              <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link href="/tutors" className="btn btn-secondary btn-lg">
              Meet the tutors
            </Link>
          </div>
          <p className="enter mt-5 text-sm text-muted" style={{ "--i": 4 } as React.CSSProperties}>
            You only pay after a tutor accepts. Free cancellation up to {bookingRules.freeCancelHours} hours before.
          </p>
        </div>
        <HeroStack {...stack} />
      </div>
    </section>
  );
}
