import Link from "next/link";
import { bookingRules, pricing, site } from "@/config/site";
import { ArrowRight, Card, Check, Video } from "@/components/icons";
import { FaqList } from "@/components/site/faq-list";
import { Section, SectionHeading } from "@/components/site/section";
import { TutorCard } from "@/components/site/tutor-card";
import { FAQ } from "@/content/faq";
import { formatPrice } from "@/lib/booking/policy";
import { teachableSubjectIds, type Catalog } from "@/lib/data/catalog";
import { daysBetween, formatLocalDate, relativeDays } from "@/lib/time";

export function UpcomingTests({ catalog }: { catalog: Catalog }) {
  const subjects = new Map(catalog.subjects.map((s) => [s.id, s]));
  const tests = catalog.tests.filter((t) => subjects.has(t.subjectId)).slice(0, 8);

  return (
    <Section id="tests" labelledBy="tests-title">
      <SectionHeading
        id="tests-title"
        title="Upcoming tests"
        lead="The tests we know are coming up. Most students book a review a few days before. Yours doesn't need to be on the list to book."
      />
      {tests.length > 0 ? (
        <ul className="card mt-10 divide-y divide-line overflow-hidden p-0">
          {tests.map((t) => {
            const subject = subjects.get(t.subjectId)!;
            const days = daysBetween(catalog.today, t.testDate);
            const [, month, day] = t.testDate.split("-");
            const monthLabel = new Date(Date.UTC(2000, Number(month) - 1, 1)).toLocaleString("en-US", {
              month: "short",
              timeZone: "UTC",
            });
            return (
              <li key={t.id} className="row-hover flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4 transition-colors sm:flex-nowrap sm:px-6">
                <div className="grid w-12 shrink-0 place-items-center rounded-[14px] border border-line py-1.5 text-center">
                  <span className="text-[0.6875rem] font-semibold tracking-[0.04em] text-accent-text uppercase">
                    {monthLabel}
                  </span>
                  <span className="tabular -mt-0.5 text-xl leading-tight font-[650] tracking-[-0.03em]">
                    {Number(day)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold tracking-[-0.012em]">{t.course}</p>
                  <p className="text-sm text-muted">
                    {subject.name}
                    {t.level ? ` · ${t.level === "honors" ? "Honors" : "Regular"}` : ""} · {formatLocalDate(t.testDate)}
                  </p>
                </div>
                <span className="tabular hidden text-sm font-medium text-ink-2 sm:inline">{relativeDays(days)}</span>
                <Link
                  href={`/book?subject=${subject.slug}&test=${t.id}`}
                  className="btn btn-secondary btn-sm w-full sm:w-auto"
                  aria-label={`Book a review for ${t.course}`}
                >
                  Book a review
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="card mt-10 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
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
    <Section tone="subtle" labelledBy="tutors-title">
      <SectionHeading
        id="tutors-title"
        title="Your tutors"
        lead={`${countWord(catalog.tutors.length)} ${site.school} students who started this together and tutor every session themselves. Each has earned many 100s on Regents exams.`}
        action={
          <Link href="/tutors" className="btn btn-ghost btn-sm text-accent-text">
            All tutors <ArrowRight size={16} />
          </Link>
        }
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {catalog.tutors.map((t) => (
          <TutorCard key={t.id} tutor={t} subjects={catalog.subjects} />
        ))}
      </div>
    </Section>
  );
}

export function SubjectsAndPricing({ catalog }: { catalog: Catalog }) {
  const teachable = teachableSubjectIds(catalog);
  return (
    <Section labelledBy="subjects-title">
      <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <div>
          <SectionHeading
            id="subjects-title"
            title="Subjects"
            lead="Regular and honors. Pick one when you book and we'll match you with a tutor who teaches it."
          />
          <ul className="mt-8 grid gap-2 sm:grid-cols-2">
            {catalog.subjects.map((s) => {
              const open = teachable.has(s.id);
              return (
                <li key={s.id}>
                  <Link
                    href={`/book?subject=${s.slug}`}
                    className="group flex min-h-16 items-center justify-between gap-3 rounded-[18px] border border-line bg-surface px-4 py-3 transition-[border-color,transform] duration-150 active:scale-[0.98]"
                  >
                    <span>
                      <span className="block font-semibold tracking-[-0.012em]">{s.name}</span>
                      <span className="block text-sm text-muted">
                        {open ? (s.hasHonors ? "Regular and honors" : "Regular") : "No tutor yet"}
                      </span>
                    </span>
                    <ArrowRight size={17} className="text-muted transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h2 className="t-h2">Simple pricing</h2>
          <p className="t-lead mt-4">One price per session. No packages or sign-up fees.</p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {([30, 60] as const).map((m) => (
              <div key={m} className={`card p-5 ${m === 60 ? "ring-1 ring-accent/30" : ""}`}>
                <p className="t-label">{m === 30 ? "30 minutes" : "1 hour"}</p>
                <p className="tabular mt-2 text-[2.5rem] leading-none font-[650] tracking-[-0.045em]">
                  {formatPrice(pricing[m])}
                </p>
                <p className="mt-2 text-sm text-muted">{m === 30 ? "A focused review of one topic" : "A full test review"}</p>
              </div>
            ))}
          </div>
          <ul className="mt-6 space-y-2.5 text-ink-2">
            {[
              "Pay only after a tutor accepts",
              `Free cancellation up to ${bookingRules.freeCancelHours} hours before`,
              "Secure checkout through Stripe",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <Check size={18} className="mt-0.5 shrink-0 text-accent-text" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

const STEPS = [
  {
    icon: ArrowRight,
    title: "Pick a subject and a few times",
    body: "Choose 30 minutes or an hour, then up to three times that work. You'll only see times when a tutor is free.",
  },
  {
    icon: Card,
    title: "A tutor accepts, then you pay",
    body: "A tutor who teaches your subject confirms, and you and your parent get a payment link. Nothing is charged before that.",
  },
  {
    icon: Video,
    title: "Meet on Zoom",
    body: "You get the Zoom link and a calendar invite. Bring your notes and what's on the test.",
  },
];

export function HowItWorks() {
  return (
    <Section tone="subtle" labelledBy="how-title">
      <SectionHeading id="how-title" title="How it works" />
      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="card p-6">
            <span className="tabular grid size-9 place-items-center rounded-full bg-accent text-sm font-semibold text-on-accent">
              {i + 1}
            </span>
            <h3 className="t-h3 mt-5">{step.title}</h3>
            <p className="mt-2 text-ink-2">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function FaqTeaser() {
  return (
    <Section labelledBy="faq-title">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div>
          <h2 id="faq-title" className="t-h2">
            Questions
          </h2>
          <p className="t-lead mt-4">The things students and parents ask us most.</p>
          <Link href="/faq" className="btn btn-secondary mt-6">
            Read all questions
          </Link>
        </div>
        <FaqList items={FAQ.slice(0, 5)} />
      </div>
    </Section>
  );
}

export function ClosingCta() {
  return (
    <section className="px-4 pb-16 sm:px-6 md:pb-24">
      <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-accent px-6 py-14 text-on-accent sm:px-12 md:py-20">
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-40 [background-image:linear-gradient(rgb(255_255_255/0.12)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.12)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_70%_90%_at_85%_20%,#000_20%,transparent_70%)]" />
        <h2 className="t-h2 max-w-2xl">Book a review before your next test.</h2>
        <p className="mt-4 max-w-xl text-lg text-white/85">
          It takes about two minutes. You only pay once a tutor accepts.
        </p>
        <Link href="/book" className="btn btn-lg mt-8 bg-white text-[#0b1526] hover:bg-white/90">
          Book a session <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}
