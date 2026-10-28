import Link from "next/link";
import { bookingRules, pricing, site } from "@/config/site";
import { ArrowRight, Check } from "@/components/icons";
import { FaqList } from "@/components/site/faq-list";
import { Section } from "@/components/site/section";
import { TutorCard } from "@/components/site/tutor-card";
import { FAQ } from "@/content/faq";
import { formatPrice } from "@/lib/booking/policy";
import { teachableSubjectIds, type Catalog } from "@/lib/data/catalog";
import { daysBetween, relativeDays } from "@/lib/time";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function UpcomingTests({ catalog }: { catalog: Catalog }) {
  const subjects = new Map(catalog.subjects.map((s) => [s.id, s]));
  const tests = catalog.tests.filter((t) => subjects.has(t.subjectId)).slice(0, 8);

  return (
    <Section
      id="tests"
      title="Upcoming tests"
      lead="The tests we know are coming up. Most students book a review a few days before. Yours doesn't need to be on the list."
    >
      {tests.length > 0 ? (
        <ul className="border-t border-line">
          {tests.map((t) => {
            const subject = subjects.get(t.subjectId)!;
            const [y, m, d] = t.testDate.split("-").map(Number);
            const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
            return (
              <li
                key={t.id}
                className="row-hover grid grid-cols-[4.5rem_1fr] items-center gap-x-5 gap-y-3 border-b border-line py-4 transition-colors sm:grid-cols-[4.5rem_1fr_auto_auto] sm:px-2"
              >
                <div className="font-display leading-none">
                  <span className="tabular block text-[1.75rem] font-[750] tracking-[-0.04em]">{d}</span>
                  <span className="t-label mt-1 block">
                    {MONTHS[m - 1]} · {weekday}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">{t.course}</p>
                  <p className="text-sm text-muted">
                    {subject.name}
                    {t.level ? ` · ${t.level === "honors" ? "Honors" : "Regular"}` : ""}
                  </p>
                </div>
                <span className="tabular hidden text-sm text-ink-2 sm:block">
                  {relativeDays(daysBetween(catalog.today, t.testDate))}
                </span>
                <Link
                  href={`/book?subject=${subject.slug}&test=${t.id}`}
                  className="btn btn-secondary btn-sm col-span-2 sm:col-span-1"
                  aria-label={`Book a review for ${t.course}`}
                >
                  Book a review
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-start gap-4 border-y border-line py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-ink-2">No tests are posted right now. You can still book a review for any subject.</p>
          <Link href="/book" className="btn btn-primary btn-sm">
            See open times
          </Link>
        </div>
      )}
    </Section>
  );
}

function countWord(n: number) {
  const words = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];
  return words[n] ?? String(n);
}

export function TutorsSection({ catalog }: { catalog: Catalog }) {
  return (
    <Section
      title="Your tutors"
      tone="subtle"
      lead={`${countWord(catalog.tutors.length)} ${site.school} students who started this together and tutor every session themselves. Each has earned many 100s on Regents exams.`}
      action={
        <Link href="/tutors" className="link inline-flex items-center gap-1 font-semibold">
          All tutors <ArrowRight size={16} />
        </Link>
      }
    >
      <div className="grid gap-x-8 sm:grid-cols-2">
        {catalog.tutors.map((t) => (
          <TutorCard key={t.id} tutor={t} subjects={catalog.subjects} />
        ))}
      </div>
    </Section>
  );
}

export function SubjectsSection({ catalog }: { catalog: Catalog }) {
  const teachable = teachableSubjectIds(catalog);
  return (
    <Section
      title="Subjects"
      lead="Regular and honors. Pick one when you book and you'll only see times a tutor for it is free."
    >
      <ul className="grid border-t border-line sm:grid-cols-2 sm:gap-x-8">
        {catalog.subjects.map((s) => {
          const open = teachable.has(s.id);
          return (
            <li key={s.id} className="border-b border-line">
              <Link href={`/book?subject=${s.slug}`} className="group flex min-h-16 items-center justify-between gap-3 py-3">
                <span>
                  <span className="block font-semibold">{s.name}</span>
                  <span className="block text-sm text-muted">
                    {open ? (s.hasHonors ? "Regular and honors" : "Regular") : "No tutor yet"}
                  </span>
                </span>
                <ArrowRight size={18} className="text-muted transition-colors group-hover:text-accent-text" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

export function PricingSection() {
  return (
    <Section title="Pricing" tone="subtle" lead="One price per session. No packages, sign-up fees or subscriptions.">
      <div className="grid border-t border-line sm:grid-cols-2">
        {([30, 60] as const).map((m, i) => (
          <div key={m} className={`py-6 ${i === 1 ? "border-t border-line sm:border-t-0 sm:border-l sm:pl-8" : "sm:pr-8"}`}>
            <p className="t-label">{m === 30 ? "30 minutes" : "1 hour"}</p>
            <p className="font-display tabular mt-2 text-[3.5rem] leading-none font-[750] tracking-[-0.05em]">
              {formatPrice(pricing[m])}
            </p>
            <p className="mt-3 text-ink-2">{m === 30 ? "A focused review of one topic." : "A full review before a test."}</p>
          </div>
        ))}
      </div>
      <ul className="space-y-2.5 border-t border-line pt-6 text-ink-2">
        {[
          "Pay only after a tutor claims your request",
          `Free cancellation up to ${bookingRules.freeCancelHours} hours before`,
          "Secure checkout through Stripe",
        ].map((line) => (
          <li key={line} className="flex items-start gap-3">
            <Check size={18} className="mt-0.5 shrink-0 text-accent-text" />
            {line}
          </li>
        ))}
      </ul>
    </Section>
  );
}

const STEPS = [
  {
    title: "Pick a subject and a few times",
    body: "Choose 30 minutes or an hour, then up to three times that work. You'll only see times when a tutor is free.",
  },
  {
    title: "A tutor claims it, then you pay",
    body: "Your request goes to all of our tutors. Whoever can take one of your times claims it, and you and your parent get a payment link.",
  },
  {
    title: "Meet on Zoom",
    body: "You get the Zoom link and a calendar invite. Bring your notes and what's on the test.",
  },
];

export function HowItWorks() {
  return (
    <Section title="How it works">
      <ol className="grid border-t border-line md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className={`py-6 ${i > 0 ? "border-t border-line md:border-t-0 md:border-l md:pl-6" : ""} ${
              i < STEPS.length - 1 ? "md:pr-6" : ""
            }`}
          >
            <span className="font-display tabular block text-[2.5rem] leading-none font-[750] tracking-[-0.04em] text-accent-text">
              {i + 1}
            </span>
            <h3 className="t-h3 mt-4">{step.title}</h3>
            <p className="mt-2 text-ink-2">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function FaqTeaser() {
  return (
    <Section
      title="Questions"
      tone="subtle"
      lead="The things students and parents ask us most."
      action={
        <Link href="/faq" className="btn btn-secondary">
          Read all questions
        </Link>
      }
    >
      <FaqList items={FAQ.slice(0, 5)} />
    </Section>
  );
}

export function ClosingCta() {
  return (
    <section className="bg-accent text-on-accent">
      <div className="wrap grid gap-8 py-16 md:py-20 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <h2 className="t-h2">Book a review before your next test.</h2>
          <p className="mt-4 max-w-xl text-lg text-white/90">It takes about two minutes. You only pay once a tutor claims it.</p>
        </div>
        <div className="lg:col-span-4 lg:text-right">
          <Link href="/book" className="btn btn-lg border-white bg-white text-[#0f172a] hover:bg-white/90">
            Book a session <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
