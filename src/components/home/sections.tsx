import Link from "next/link";
import { bookingRules, pricing, site } from "@/config/site";
import { ArrowRight } from "@/components/icons";
import { FaqList } from "@/components/site/faq-list";
import { Section } from "@/components/site/section";
import { TutorCard } from "@/components/site/tutor-card";
import { FAQ } from "@/content/faq";
import { formatPrice } from "@/lib/booking/policy";
import { teachableSubjectIds, type Catalog } from "@/lib/data/catalog";
import { daysBetween, relativeDays } from "@/lib/time";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The next few tests, each with one button. Yours doesn't need to be on the list. */
export function UpcomingTests({ catalog }: { catalog: Catalog }) {
  const subjects = new Map(catalog.subjects.map((s) => [s.id, s]));
  const tests = catalog.tests.filter((t) => subjects.has(t.subjectId)).slice(0, 4);

  return (
    <Section id="tests" title="Upcoming tests" lead="Book a review before yours. It doesn't need to be on the list.">
      {tests.length > 0 ? (
        <ul>
          {tests.map((t) => {
            const subject = subjects.get(t.subjectId)!;
            const [, m, d] = t.testDate.split("-").map(Number);
            return (
              <li
                key={t.id}
                className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-x-5 border-b border-line py-5 first:pt-0"
              >
                <div className="font-display leading-none">
                  <span className="tabular block text-[1.75rem] font-[750] tracking-[-0.04em]">{d}</span>
                  <span className="t-label mt-1 block uppercase">{MONTHS[m - 1]}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">{t.course}</p>
                  <p className="text-sm text-muted">
                    {subject.name} · {relativeDays(daysBetween(catalog.today, t.testDate))}
                  </p>
                </div>
                <Link
                  href={`/book?subject=${subject.slug}&test=${t.id}`}
                  className="link font-semibold whitespace-nowrap"
                  aria-label={`Book a review for ${t.course}`}
                >
                  Book <ArrowRight size={15} className="inline" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-ink-2">
          No tests are posted right now.{" "}
          <Link href="/book" className="link font-semibold">
            Book a review for any subject
          </Link>
          .
        </p>
      )}
    </Section>
  );
}

const STEPS = [
  { title: "Pick a subject and times", body: "Choose up to three times that work for you." },
  { title: "A tutor claims it", body: "You and your parent get a payment link." },
  { title: "Meet on Zoom", body: "Bring your notes and what's on the test." },
];

export function HowItWorks() {
  return (
    <Section title="How it works">
      <ol className="grid gap-8 md:grid-cols-3 md:gap-6">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <span className="font-display tabular text-[1.5rem] leading-none font-[750] tracking-[-0.03em] text-accent-text">
              {i + 1}
            </span>
            <h3 className="t-h3 mt-3">{step.title}</h3>
            <p className="mt-1.5 text-ink-2">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function TutorsSection({ catalog }: { catalog: Catalog }) {
  return (
    <Section
      title="Your tutors"
      lead={`${site.school} students who each earned many 100s on the Regents.`}
      action={
        <Link href="/tutors" className="link inline-flex items-center gap-1 font-semibold">
          Tutor details <ArrowRight size={16} />
        </Link>
      }
    >
      <div className="grid gap-x-8 sm:grid-cols-2">
        {catalog.tutors.map((t) => (
          <TutorCard key={t.id} tutor={t} subjects={catalog.subjects} showGrade={false} />
        ))}
      </div>
    </Section>
  );
}

/** Price as two numbers, subjects as one line of links. */
export function SubjectsAndPricing({ catalog }: { catalog: Catalog }) {
  const teachable = teachableSubjectIds(catalog);
  return (
    <Section title="Pricing and subjects">
      <div className="flex flex-wrap gap-x-16 gap-y-8">
        {([30, 60] as const).map((m) => (
          <div key={m}>
            <p className="t-label">{m === 30 ? "30 minutes" : "1 hour"}</p>
            <p className="font-display tabular mt-1 text-[3.5rem] leading-none font-[750] tracking-[-0.05em]">
              {formatPrice(pricing[m])}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-6 max-w-md text-ink-2">
        You pay after a tutor claims your request. Free cancellation up to {bookingRules.freeCancelHours} hours before.
      </p>

      <p className="t-label mt-14">Subjects, regular and honors</p>
      <ul className="mt-3 flex flex-wrap gap-x-7 gap-y-2">
        {catalog.subjects.map((s) => {
          const open = teachable.has(s.id);
          return (
            <li key={s.id}>
              {open ? (
                <Link href={`/book?subject=${s.slug}`} className="font-semibold transition-colors hover:text-accent-text">
                  {s.name}
                </Link>
              ) : (
                <span className="text-muted">{s.name} (no tutor yet)</span>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

export function FaqTeaser() {
  return (
    <Section
      title="Questions"
      action={
        <Link href="/faq" className="link inline-flex items-center gap-1 font-semibold">
          All questions <ArrowRight size={16} />
        </Link>
      }
    >
      <FaqList items={FAQ.slice(0, 3)} />
    </Section>
  );
}
