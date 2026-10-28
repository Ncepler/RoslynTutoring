import Link from "next/link";
import { bookingRules, pricing, site } from "@/config/site";
import { ArrowRight } from "@/components/icons";
import { formatPrice } from "@/lib/booking/policy";
import type { Catalog } from "@/lib/data/catalog";
import { daysBetween, formatLocalDate, formatMinute, relativeDays } from "@/lib/time";

function list(names: string[]) {
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? "");
}

/**
 * Type-only hero. Left: the promise and the two actions. Right: the facts a
 * parent wants before booking, as a ruled table, ending with the next real
 * test on the schedule.
 */
export function Hero({ catalog }: { catalog: Catalog }) {
  const subjectsById = new Map(catalog.subjects.map((s) => [s.id, s]));
  const next = catalog.tests.find((t) => subjectsById.has(t.subjectId));
  const nextSubject = next ? subjectsById.get(next.subjectId) : undefined;
  const grades = `${site.grades[0]} to ${site.grades[site.grades.length - 1]}`;

  const facts: { label: string; value: React.ReactNode }[] = [
    {
      label: "Price",
      value: (
        <>
          <span className="tabular">{formatPrice(pricing[30])}</span> for 30 minutes,{" "}
          <span className="tabular">{formatPrice(pricing[60])}</span> for an hour
        </>
      ),
    },
    { label: "Format", value: "One-on-one on Zoom" },
    {
      label: "When",
      value: `${bookingRules.allowWeekends ? "Any day" : "Weekdays"} from ${formatMinute(bookingRules.earliestStartMinute)}`,
    },
    { label: "For", value: `${site.school} students in grades ${grades}` },
    { label: "Tutors", value: list(catalog.tutors.map((t) => t.firstName)) },
  ];

  return (
    <section className="border-b border-line">
      <div className="wrap grid gap-12 pt-12 pb-16 md:pt-20 md:pb-24 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <p className="t-label enter" style={{ "--i": 0 } as React.CSSProperties}>
            Student-run tutoring in {site.area}
          </p>
          <h1 className="t-display enter-tf mt-5" style={{ "--i": 1 } as React.CSSProperties}>
            Test coming up? Review with a {site.school} student who&apos;s been there.
          </h1>
          <p className="t-lead enter mt-6 max-w-xl" style={{ "--i": 2 } as React.CSSProperties}>
            Bring your notes and what&apos;s on the test. Every tutor is a {site.school} student who has earned many
            100s on the Regents, and you only pay once one of them claims your request.
          </p>
          <div className="enter mt-8 flex flex-wrap gap-3" style={{ "--i": 3 } as React.CSSProperties}>
            <Link href="/book" className="btn btn-primary btn-lg">
              Book a review <ArrowRight size={18} />
            </Link>
            <Link href="/tutors" className="btn btn-secondary btn-lg">
              Meet the tutors
            </Link>
          </div>
          <p className="enter mt-5 text-sm text-muted" style={{ "--i": 4 } as React.CSSProperties}>
            Free cancellation up to {bookingRules.freeCancelHours} hours before. No accounts, no packages.
          </p>
        </div>

        <aside className="enter lg:col-span-4 lg:col-start-9" style={{ "--i": 3 } as React.CSSProperties} aria-label="At a glance">
          <dl className="rule-top">
            {facts.map((f) => (
              <div key={f.label} className="grid grid-cols-[6.5rem_1fr] gap-4 border-b border-line py-3.5">
                <dt className="t-label pt-0.5">{f.label}</dt>
                <dd className="font-medium">{f.value}</dd>
              </div>
            ))}
            {next && nextSubject && (
              <div className="grid grid-cols-[6.5rem_1fr] gap-4 border-b border-line py-3.5">
                <dt className="t-label pt-0.5">Next test</dt>
                <dd>
                  <span className="block font-medium">{next.course}</span>
                  <span className="block text-sm text-muted">
                    {formatLocalDate(next.testDate)} · {relativeDays(daysBetween(catalog.today, next.testDate))}
                  </span>
                  <Link
                    href={`/book?subject=${nextSubject.slug}&test=${next.id}`}
                    className="link mt-1.5 inline-flex items-center gap-1 text-sm font-semibold"
                  >
                    Book a review for it <ArrowRight size={15} />
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </aside>
      </div>
    </section>
  );
}
