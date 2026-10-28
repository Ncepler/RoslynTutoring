"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Calendar, Check, Close, Spinner } from "@/components/icons";
import { Segmented } from "./segmented";

export type FlowSubject = { id: string; slug: string; name: string; hasHonors: boolean; teachable: boolean };
export type FlowTest = { id: string; subjectId: string; course: string; dateLabel: string };

type Slot = { start: string; date: string; minute: number };
type Level = "regular" | "honors";

export type BookingFlowProps = {
  subjects: FlowSubject[];
  tests: FlowTest[];
  prices: Record<30 | 60, string>;
  grades: number[];
  maxPreferences: number;
  freeCancelHours: number;
  preview: boolean;
};

const STEPS = ["Subject", "Time", "Your details", "Review"] as const;
const TZ = "America/New_York";

const fmtTime = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const fmtDayShort = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" });
const fmtDayNum = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const fmtFull = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function utcDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const ORDINAL = ["1st", "2nd", "3rd", "4th", "5th"];

type Details = {
  firstName: string;
  lastName: string;
  grade: number | null;
  email: string;
  parentName: string;
  parentEmail: string;
  consent: boolean;
  website: string;
};

const EMPTY_DETAILS: Details = {
  firstName: "",
  lastName: "",
  grade: null,
  email: "",
  parentName: "",
  parentEmail: "",
  consent: false,
  website: "",
};

/** Which error key (matching the server's) each field clears when edited. */
const ERROR_KEY: Record<keyof Details, string> = {
  firstName: "student.firstName",
  lastName: "student.lastName",
  grade: "student.grade",
  email: "student.email",
  parentName: "parent.name",
  parentEmail: "parent.email",
  consent: "consent",
  website: "website",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateDetails(d: Details): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.firstName.trim()) e["student.firstName"] = "First name is required";
  if (!d.lastName.trim()) e["student.lastName"] = "Last name is required";
  if (d.grade === null) e["student.grade"] = "Pick your grade";
  if (!EMAIL_RE.test(d.email.trim())) e["student.email"] = "Enter a valid email";
  if (!d.parentName.trim()) e["parent.name"] = "Parent or guardian name is required";
  if (!EMAIL_RE.test(d.parentEmail.trim())) e["parent.email"] = "Enter a valid email";
  else if (d.parentEmail.trim().toLowerCase() === d.email.trim().toLowerCase())
    e["parent.email"] = "Use a parent or guardian's own email";
  if (!d.consent) e.consent = "A parent or guardian needs to agree before booking";
  return e;
}

type Done = { token: string; startAt: string; preferenceIndex: number };

export function BookingFlow(props: BookingFlowProps) {
  const params = useSearchParams();
  const { subjects, tests, prices, maxPreferences } = props;

  const initialSubject = subjects.find((s) => s.slug === params.get("subject")) ?? null;
  const initialTest = tests.find((t) => t.id === params.get("test") && t.subjectId === initialSubject?.id) ?? null;

  const [step, setStep] = useState(0);
  const [subjectId, setSubjectId] = useState<string | null>(initialSubject?.id ?? null);
  const [level, setLevel] = useState<Level>("regular");
  const [testId, setTestId] = useState<string | null>(initialTest?.id ?? null);
  const [duration, setDuration] = useState<30 | 60>(60);
  const [picks, setPicks] = useState<string[]>([]);
  const [details, setDetails] = useState<Details>(EMPTY_DETAILS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const subject = subjects.find((s) => s.id === subjectId) ?? null;
  const subjectTests = tests.filter((t) => t.subjectId === subjectId);

  // ---- availability -------------------------------------------------------
  const [slotCache, setSlotCache] = useState<Record<string, Slot[]>>({});
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const key = subjectId ? `${subjectId}:${duration}` : null;
  const slots = key ? slotCache[key] : undefined;

  useEffect(() => {
    if (!key || !subjectId || slotCache[key] || !subject?.teachable) return;
    const controller = new AbortController();
    fetch(`/api/availability?subject=${encodeURIComponent(subjectId)}&duration=${duration}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Couldn't load times.");
        setSlotsError(null);
        setSlotCache((c) => ({ ...c, [key]: json.slots as Slot[] }));
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setSlotsError(err.message || "Couldn't load times.");
      });
    return () => controller.abort();
  }, [key, subjectId, duration, slotCache, subject?.teachable]);

  const refreshSlots = useCallback(() => {
    if (!key) return;
    setSlotCache((c) => {
      const next = { ...c };
      delete next[key];
      return next;
    });
  }, [key]);

  // Drop picks that are no longer offered (after a refresh or a length change).
  const validPicks = useMemo(() => {
    if (!slots) return picks;
    const open = new Set(slots.map((s) => s.start));
    return picks.filter((p) => open.has(p));
  }, [picks, slots]);

  // ---- navigation ---------------------------------------------------------
  const panelRef = useRef<HTMLDivElement>(null);
  const goTo = (next: number) => {
    setStep(next);
    setFormError(null);
    requestAnimationFrame(() => {
      const el = panelRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 96;
      if (window.scrollY > top) window.scrollTo({ top, behavior: "smooth" });
      el.focus({ preventScroll: true });
    });
  };

  const canContinue =
    step === 0 ? Boolean(subject?.teachable) : step === 1 ? validPicks.length > 0 : step === 2 ? true : !submitting;

  function next() {
    if (step === 2) {
      const e = validateDetails(details);
      setErrors(e);
      if (Object.keys(e).length > 0) {
        setFormError("Check the highlighted fields.");
        const first = document.querySelector<HTMLElement>("[aria-invalid='true']");
        first?.focus();
        return;
      }
    }
    if (step === 3) return submit();
    goTo(step + 1);
  }

  async function submit() {
    if (!subject) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subjectId: subject.id,
          level: subject.hasHonors ? level : "regular",
          durationMinutes: duration,
          preferences: validPicks,
          testId,
          student: {
            firstName: details.firstName,
            lastName: details.lastName,
            grade: details.grade,
            email: details.email,
          },
          parent: { name: details.parentName, email: details.parentEmail },
          consent: details.consent,
          website: details.website,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setDone(json as Done);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (res.status === 409) {
        setPicks([]);
        refreshSlots();
        goTo(1);
        setFormError(json.error);
        return;
      }
      if (json.fields) {
        setErrors(json.fields);
        if (Object.keys(json.fields).some((k) => k.startsWith("student") || k.startsWith("parent") || k === "consent")) {
          goTo(2);
        }
      }
      setFormError(json.error ?? "Something went wrong. Please try again.");
    } catch {
      setFormError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) return <Confirmation done={done} subject={subject!} duration={duration} preview={props.preview} />;

  const summary = (
    <Summary
      subject={subject}
      level={level}
      duration={duration}
      price={prices[duration]}
      picks={validPicks}
      test={subjectTests.find((t) => t.id === testId) ?? null}
    />
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
      {/* min-w-0: the swipeable day strip must not stretch this column past the screen. */}
      <div className="min-w-0">
        <Progress step={step} onJump={(i) => i < step && goTo(i)} />
        <div
          ref={panelRef}
          tabIndex={-1}
          key={step}
          className="swap-in mt-8 outline-none"
          aria-live="polite"
        >
          {step === 0 && (
            <SubjectStep
              subjects={subjects}
              subjectId={subjectId}
              onSubject={(id) => {
                setSubjectId(id);
                setPicks([]);
                setTestId(null);
              }}
              subject={subject}
              level={level}
              onLevel={setLevel}
              tests={subjectTests}
              testId={testId}
              onTest={setTestId}
            />
          )}
          {step === 1 && subject && (
            <TimeStep
              subject={subject}
              duration={duration}
              onDuration={(d) => {
                setDuration(d);
                setPicks([]);
              }}
              prices={prices}
              slots={slots}
              error={slotsError}
              onRetry={refreshSlots}
              picks={validPicks}
              maxPreferences={maxPreferences}
              onToggle={(start) =>
                setPicks((p) =>
                  p.includes(start)
                    ? p.filter((x) => x !== start)
                    : validPicks.length >= maxPreferences
                      ? p
                      : [...validPicks, start],
                )
              }
            />
          )}
          {step === 2 && (
            <DetailsStep
              details={details}
              grades={props.grades}
              errors={errors}
              onChange={(patch) => {
                setDetails((d) => ({ ...d, ...patch }));
                setErrors((e) => {
                  const nextErrors = { ...e };
                  for (const field of Object.keys(patch) as (keyof Details)[]) delete nextErrors[ERROR_KEY[field]];
                  return nextErrors;
                });
              }}
            />
          )}
          {step === 3 && subject && (
            <ReviewStep
              subject={subject}
              level={level}
              duration={duration}
              price={prices[duration]}
              picks={validPicks}
              details={details}
              freeCancelHours={props.freeCancelHours}
              test={subjectTests.find((t) => t.id === testId) ?? null}
              onEdit={goTo}
            />
          )}
        </div>

        {formError && (
          <p className="swap-in mt-6 rounded-[14px] bg-danger-soft px-4 py-3 text-sm font-medium text-danger" role="alert">
            {formError}
          </p>
        )}

        {/* Desktop controls */}
        <div className="mt-10 hidden items-center justify-between border-t border-line pt-6 lg:flex">
          {step > 0 ? (
            <button type="button" className="btn btn-ghost" onClick={() => goTo(step - 1)}>
              <ArrowLeft size={17} /> Back
            </button>
          ) : (
            <span />
          )}
          <ContinueButton step={step} disabled={!canContinue} submitting={submitting} onClick={next} />
        </div>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-[calc(var(--header-h)+1.5rem)]">{summary}</div>
      </aside>

      {/* Mobile: a bar pinned to the bottom, clear of the home indicator. */}
      <div className="glass fixed inset-x-0 bottom-0 z-30 border-t border-line px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              className="grid size-12 shrink-0 place-items-center rounded-full border border-line-strong bg-surface active:scale-95"
              onClick={() => goTo(step - 1)}
              aria-label="Back"
            >
              <ArrowLeft size={19} />
            </button>
          )}
          <div className="min-w-0 flex-1 text-sm leading-tight">
            <p className="truncate font-semibold">{subject ? subject.name : "Pick a subject"}</p>
            <p className="truncate text-muted">
              {duration} min · {prices[duration]}
              {validPicks.length > 0 ? ` · ${validPicks.length} time${validPicks.length > 1 ? "s" : ""}` : ""}
            </p>
          </div>
          <ContinueButton step={step} disabled={!canContinue} submitting={submitting} onClick={next} compact />
        </div>
      </div>
      <div className="h-20 lg:hidden" aria-hidden="true" />
    </div>
  );
}

function ContinueButton({
  step,
  disabled,
  submitting,
  onClick,
  compact = false,
}: {
  step: number;
  disabled: boolean;
  submitting: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const label = step === 3 ? (submitting ? "Sending" : "Send request") : "Continue";
  return (
    <button
      type="button"
      className={`btn btn-primary ${compact ? "" : "btn-lg"}`}
      disabled={disabled}
      onClick={onClick}
    >
      {submitting && <Spinner />}
      {label}
      {!submitting && step < 3 && <ArrowRight size={17} />}
    </button>
  );
}

function Progress({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  return (
    <nav aria-label="Booking steps">
      <ol className="flex gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <button
              type="button"
              onClick={() => onJump(i)}
              disabled={i >= step}
              aria-current={i === step ? "step" : undefined}
              className="group w-full text-left disabled:cursor-default"
            >
              <span className="block h-1 overflow-hidden rounded-full bg-line">
                <span
                  className="block h-full origin-left rounded-full bg-accent transition-transform duration-500 ease-[var(--ease-out)] motion-reduce:transition-none"
                  style={{ transform: `scaleX(${i <= step ? 1 : 0})` }}
                />
              </span>
              <span
                className={`mt-2 hidden text-[0.8125rem] font-medium sm:block ${
                  i === step ? "text-ink" : i < step ? "text-ink-2 group-hover:text-ink" : "text-muted"
                }`}
              >
                {label}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[0.8125rem] font-medium text-muted sm:hidden">
        Step {step + 1} of {STEPS.length}: <span className="text-ink">{STEPS[step]}</span>
      </p>
    </nav>
  );
}

function StepTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[1.75rem] leading-tight font-[650] tracking-[-0.03em] sm:text-[2rem]">{children}</h2>
      {sub && <p className="mt-2 text-ink-2">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1: subject
// ---------------------------------------------------------------------------

function SubjectStep(props: {
  subjects: FlowSubject[];
  subjectId: string | null;
  onSubject: (id: string) => void;
  subject: FlowSubject | null;
  level: Level;
  onLevel: (l: Level) => void;
  tests: FlowTest[];
  testId: string | null;
  onTest: (id: string | null) => void;
}) {
  return (
    <div className="space-y-8">
      <StepTitle sub="We'll match you with a tutor who teaches it.">What do you need help with?</StepTitle>
      <fieldset>
        <legend className="sr-only">Subject</legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {props.subjects.map((s) => {
            const selected = s.id === props.subjectId;
            return (
              <label
                key={s.id}
                className={`relative flex min-h-[4.25rem] cursor-pointer items-center justify-between gap-3 rounded-[18px] border bg-surface px-4 py-3 transition-[border-color,box-shadow,transform] duration-150 active:scale-[0.985] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                  selected ? "border-accent shadow-[0_0_0_3px_var(--accent-soft)]" : "border-line"
                }`}
              >
                <input
                  type="radio"
                  name="subject"
                  value={s.id}
                  checked={selected}
                  onChange={() => props.onSubject(s.id)}
                  className="sr-only"
                />
                <span>
                  <span className="block font-semibold tracking-[-0.012em]">{s.name}</span>
                  <span className="block text-sm text-muted">{s.teachable ? "Tutors available" : "No tutor yet"}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`grid size-6 shrink-0 place-items-center rounded-full border transition-colors ${
                    selected ? "border-accent bg-accent text-on-accent" : "border-line-strong"
                  }`}
                >
                  {selected && <Check size={14} strokeWidth={2.5} />}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {props.subject && !props.subject.teachable && (
        <div className="swap-in rounded-[18px] border border-line bg-bg-subtle p-5" role="status">
          <p className="font-semibold">Nothing available for {props.subject.name} right now.</p>
          <p className="mt-1 text-ink-2">
            None of our tutors teach it yet. Check back soon, or pick another subject.
          </p>
        </div>
      )}

      {props.subject?.teachable && props.subject.hasHonors && (
        <div className="swap-in max-w-sm">
          <p className="mb-2 text-sm font-medium">Level</p>
          <Segmented<Level>
            label="Level"
            value={props.level}
            onChange={props.onLevel}
            options={[
              { value: "regular", label: "Regular" },
              { value: "honors", label: "Honors" },
            ]}
          />
        </div>
      )}

      {props.subject?.teachable && props.tests.length > 0 && (
        <div className="swap-in">
          <label htmlFor="test" className="mb-2 block text-sm font-medium">
            Studying for one of these? <span className="font-normal text-muted">(optional)</span>
          </label>
          <select
            id="test"
            className="field max-w-md"
            value={props.testId ?? ""}
            onChange={(e) => props.onTest(e.target.value || null)}
          >
            <option value="">Not listed / general review</option>
            {props.tests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.course} ({t.dateLabel})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: length and times
// ---------------------------------------------------------------------------

function TimeStep(props: {
  subject: FlowSubject;
  duration: 30 | 60;
  onDuration: (d: 30 | 60) => void;
  prices: Record<30 | 60, string>;
  slots: Slot[] | undefined;
  error: string | null;
  onRetry: () => void;
  picks: string[];
  maxPreferences: number;
  onToggle: (start: string) => void;
}) {
  const days = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of props.slots ?? []) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return [...map.entries()];
  }, [props.slots]);

  const [day, setDay] = useState<string | null>(null);
  const activeDay = day && days.some(([d]) => d === day) ? day : (days[0]?.[0] ?? null);
  const daySlots = days.find(([d]) => d === activeDay)?.[1] ?? [];
  const full = props.picks.length >= props.maxPreferences;

  return (
    <div className="space-y-8">
      <StepTitle
        sub={`Pick up to ${props.maxPreferences} times that work, in order of preference. We'll book the first one a tutor can take. All times are New York time.`}
      >
        When works for you?
      </StepTitle>

      <div className="max-w-md">
        <p className="mb-2 text-sm font-medium">Session length</p>
        <Segmented<30 | 60>
          label="Session length"
          size="lg"
          value={props.duration}
          onChange={props.onDuration}
          options={[
            { value: 30, label: "30 minutes", hint: props.prices[30] },
            { value: 60, label: "1 hour", hint: props.prices[60] },
          ]}
        />
      </div>

      {props.error ? (
        <div className="rounded-[18px] border border-line bg-bg-subtle p-5" role="alert">
          <p className="font-semibold">{props.error}</p>
          <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={props.onRetry}>
            Try again
          </button>
        </div>
      ) : props.slots === undefined ? (
        <SlotsSkeleton />
      ) : days.length === 0 ? (
        <div className="swap-in rounded-[18px] border border-line bg-bg-subtle p-5" role="status">
          <p className="font-semibold">Nothing available for {props.subject.name} right now.</p>
          <p className="mt-1 text-ink-2">
            No tutor who teaches it is free in the next three weeks
            {props.duration === 60 ? " for a full hour. Try 30 minutes, or check back soon." : ". Check back soon, since tutors update their hours often."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium">Day</p>
            <div
              className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
              role="radiogroup"
              aria-label="Day"
            >
              {days.map(([d, list]) => {
                const selected = d === activeDay;
                const picked = list.filter((s) => props.picks.includes(s.start)).length;
                return (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setDay(d)}
                    className={`relative flex w-[4.75rem] shrink-0 snap-start flex-col items-center rounded-[16px] border px-2 py-2.5 transition-[background-color,border-color,transform] duration-150 active:scale-95 ${
                      selected ? "border-accent bg-accent text-on-accent" : "border-line bg-surface"
                    }`}
                  >
                    <span className={`text-xs font-semibold uppercase ${selected ? "text-on-accent/85" : "text-muted"}`}>
                      {fmtDayShort.format(utcDate(d))}
                    </span>
                    <span className="tabular text-[0.9375rem] font-semibold tracking-[-0.01em]">
                      {fmtDayNum.format(utcDate(d))}
                    </span>
                    {picked > 0 && (
                      <span
                        className={`absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full text-[0.6875rem] font-bold ${
                          selected ? "bg-white text-accent" : "bg-accent text-on-accent"
                        }`}
                        aria-label={`${picked} picked`}
                      >
                        {picked}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">
              Times{full && <span className="ml-2 font-normal text-muted">You&apos;ve picked {props.maxPreferences}. Remove one to change.</span>}
            </legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {daySlots.map((s) => {
                const order = props.picks.indexOf(s.start);
                const selected = order !== -1;
                const disabled = !selected && full;
                return (
                  <label
                    key={s.start}
                    className={`relative flex min-h-12 cursor-pointer items-center justify-center rounded-[14px] border text-[0.9375rem] font-semibold transition-[background-color,border-color,transform,opacity] duration-150 active:scale-95 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                      selected
                        ? "border-accent bg-accent-soft text-accent-soft-ink"
                        : disabled
                          ? "cursor-not-allowed border-line opacity-40"
                          : "border-line bg-surface"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => props.onToggle(s.start)}
                    />
                    <span className="tabular">{fmtTime.format(new Date(s.start))}</span>
                    {selected && (
                      <span className="absolute -top-2 right-1.5 rounded-full bg-accent px-1.5 text-[0.625rem] leading-4 font-bold text-on-accent">
                        {ORDINAL[order]}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {props.picks.length > 0 && (
            <div className="swap-in">
              <p className="mb-2 text-sm font-medium">Your choices, in order</p>
              <ol className="space-y-2">
                {props.picks.map((p, i) => (
                  <li key={p} className="flex items-center justify-between gap-3 rounded-[14px] bg-bg-subtle px-4 py-2.5">
                    <span className="text-sm">
                      <span className="mr-2 font-semibold text-accent-text">{ORDINAL[i]}</span>
                      {fmtFull.format(new Date(p))}
                    </span>
                    <button
                      type="button"
                      onClick={() => props.onToggle(p)}
                      className="grid size-8 place-items-center rounded-full text-muted active:scale-95"
                      aria-label={`Remove ${fmtFull.format(new Date(p))}`}
                    >
                      <Close size={16} />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SlotsSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading times" role="status">
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-[3.75rem] w-[4.75rem] animate-pulse rounded-[16px] bg-bg-subtle" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-[14px] bg-bg-subtle" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: details
// ---------------------------------------------------------------------------

function Field(props: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  const describedBy = [props.error ? `${props.id}-error` : "", props.hint ? `${props.id}-hint` : ""].filter(Boolean).join(" ");
  return (
    <div>
      <label htmlFor={props.id} className="mb-1.5 block text-sm font-medium">
        {props.label}
      </label>
      <input
        id={props.id}
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        autoCapitalize={props.type === "email" ? "none" : "words"}
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="next"
        className="field"
        aria-invalid={Boolean(props.error)}
        aria-describedby={describedBy || undefined}
      />
      {props.hint && !props.error && (
        <p id={`${props.id}-hint`} className="mt-1.5 text-sm text-muted">
          {props.hint}
        </p>
      )}
      {props.error && (
        <p id={`${props.id}-error`} className="mt-1.5 text-sm text-danger">
          {props.error}
        </p>
      )}
    </div>
  );
}

function DetailsStep(props: {
  details: Details;
  grades: number[];
  errors: Record<string, string>;
  onChange: (patch: Partial<Details>) => void;
}) {
  const { details: d, errors: e, onChange } = props;
  return (
    <div className="space-y-10">
      <StepTitle sub="Only the four founders can see this. We never share it.">About you</StepTitle>

      <section aria-labelledby="student-heading" className="space-y-4">
        <h3 id="student-heading" className="t-h3">
          Student
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="first" label="First name" autoComplete="given-name" value={d.firstName} error={e["student.firstName"]} onChange={(v) => onChange({ firstName: v })} />
          <Field id="last" label="Last name" autoComplete="family-name" value={d.lastName} error={e["student.lastName"]} onChange={(v) => onChange({ lastName: v })} />
        </div>
        <div className="max-w-sm">
          <p className="mb-1.5 text-sm font-medium" id="grade-label">
            Grade
          </p>
          <Segmented<number>
            label="Grade"
            value={d.grade}
            onChange={(g) => onChange({ grade: g })}
            options={props.grades.map((g) => ({ value: g, label: `${g}th` }))}
          />
          {e["student.grade"] && <p className="mt-1.5 text-sm text-danger">{e["student.grade"]}</p>}
        </div>
        <Field id="email" type="email" label="Student email" autoComplete="email" value={d.email} error={e["student.email"]} hint="Where we'll send the confirmation and Zoom link." onChange={(v) => onChange({ email: v })} />
      </section>

      <section aria-labelledby="parent-heading" className="space-y-4">
        <h3 id="parent-heading" className="t-h3">
          Parent or guardian
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="parent-name" label="Full name" autoComplete="off" value={d.parentName} error={e["parent.name"]} onChange={(v) => onChange({ parentName: v })} />
          <Field id="parent-email" type="email" label="Email" autoComplete="off" value={d.parentEmail} error={e["parent.email"]} hint="They're copied on every email, including the payment link." onChange={(v) => onChange({ parentEmail: v })} />
        </div>
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-[16px] border p-4 transition-colors ${
            e.consent ? "border-danger" : d.consent ? "border-accent bg-accent-soft" : "border-line bg-surface"
          }`}
        >
          <input
            type="checkbox"
            checked={d.consent}
            onChange={(ev) => onChange({ consent: ev.target.checked })}
            className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
            aria-invalid={Boolean(e.consent)}
            aria-describedby={e.consent ? "consent-error" : undefined}
          />
          <span className="text-[0.9375rem] leading-relaxed text-ink-2">
            I&apos;m the parent or guardian named above, or they&apos;ve agreed to this booking. We agree to the{" "}
            <Link href="/terms" target="_blank" className="link">
              Terms
            </Link>
            ,{" "}
            <Link href="/privacy" target="_blank" className="link">
              Privacy policy
            </Link>{" "}
            and{" "}
            <Link href="/code-of-conduct" target="_blank" className="link">
              Code of conduct
            </Link>
            .
          </span>
        </label>
        {e.consent && (
          <p id="consent-error" className="-mt-2 text-sm text-danger">
            {e.consent}
          </p>
        )}
      </section>

      {/* Honeypot: hidden from people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={d.website} onChange={(ev) => onChange({ website: ev.target.value })} />
        </label>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4: review
// ---------------------------------------------------------------------------

function ReviewStep(props: {
  subject: FlowSubject;
  level: Level;
  duration: number;
  price: string;
  picks: string[];
  details: Details;
  freeCancelHours: number;
  test: FlowTest | null;
  onEdit: (step: number) => void;
}) {
  const rows: { label: string; value: React.ReactNode; step: number }[] = [
    {
      label: "Subject",
      value: `${props.subject.name}${props.subject.hasHonors ? ` · ${props.level === "honors" ? "Honors" : "Regular"}` : ""}${props.test ? ` · ${props.test.course}` : ""}`,
      step: 0,
    },
    {
      label: "Times",
      value: (
        <ol className="space-y-0.5">
          {props.picks.map((p, i) => (
            <li key={p}>
              <span className="mr-1.5 font-semibold text-accent-text">{ORDINAL[i]}</span>
              {fmtFull.format(new Date(p))}
            </li>
          ))}
        </ol>
      ),
      step: 1,
    },
    { label: "Length", value: `${props.duration} minutes · ${props.price}`, step: 1 },
    {
      label: "Student",
      value: `${props.details.firstName} ${props.details.lastName}, grade ${props.details.grade} · ${props.details.email}`,
      step: 2,
    },
    { label: "Parent", value: `${props.details.parentName} · ${props.details.parentEmail}`, step: 2 },
  ];
  return (
    <div className="space-y-8">
      <StepTitle sub="Nothing is charged yet. You'll pay only after a tutor accepts.">Look right?</StepTitle>
      <dl className="card divide-y divide-line p-0">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-4 px-5 py-4">
            <dt className="w-20 shrink-0 pt-0.5 text-sm text-muted">{r.label}</dt>
            <dd className="min-w-0 flex-1 text-[0.9375rem] break-words">{r.value}</dd>
            <button type="button" className="link shrink-0 text-sm font-medium" onClick={() => props.onEdit(r.step)}>
              Edit
            </button>
          </div>
        ))}
      </dl>
      <ul className="space-y-2.5 text-[0.9375rem] text-ink-2">
        {[
          "A tutor who teaches this subject gets your request and accepts or declines.",
          "If they accept, you and your parent get a payment link by email.",
          `Once paid, you're confirmed. Free cancellation up to ${props.freeCancelHours} hours before.`,
        ].map((t) => (
          <li key={t} className="flex gap-2.5">
            <Check size={18} className="mt-0.5 shrink-0 text-accent-text" />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary + confirmation
// ---------------------------------------------------------------------------

function Summary(props: {
  subject: FlowSubject | null;
  level: Level;
  duration: number;
  price: string;
  picks: string[];
  test: FlowTest | null;
}) {
  return (
    <div className="card p-6">
      <p className="t-label">Your session</p>
      <p className="mt-2 text-xl font-[650] tracking-[-0.02em]">{props.subject?.name ?? "No subject yet"}</p>
      {props.subject?.hasHonors && <p className="text-sm text-muted">{props.level === "honors" ? "Honors" : "Regular"}</p>}
      {props.test && <p className="mt-1 text-sm text-ink-2">{props.test.course}</p>}
      <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Length</span>
          <span className="font-medium">{props.duration} minutes</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span className="text-muted">Times</span>
          <span className="text-right font-medium">
            {props.picks.length === 0
              ? "None yet"
              : props.picks.map((p) => (
                  <span key={p} className="block">
                    {fmtFull.format(new Date(p))}
                  </span>
                ))}
          </span>
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
        <span className="text-sm text-muted">Due after a tutor accepts</span>
        <span className="tabular text-2xl font-[650] tracking-[-0.03em]">{props.price}</span>
      </div>
    </div>
  );
}

function Confirmation({
  done,
  subject,
  duration,
  preview,
}: {
  done: Done;
  subject: FlowSubject;
  duration: number;
  preview: boolean;
}) {
  return (
    <div className="swap-in mx-auto max-w-xl text-center" role="status">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-success-soft text-success">
        <Check size={28} strokeWidth={2.25} />
      </span>
      <h2 className="t-h2 mt-6">Request sent.</h2>
      <p className="t-lead mt-4">
        {subject.name}, {duration} minutes, {fmtFull.format(new Date(done.startAt))}
        {done.preferenceIndex > 0 ? ` (your ${ORDINAL[done.preferenceIndex]} choice, since earlier ones were taken)` : ""}.
      </p>
      <div className="card mt-8 p-6 text-left">
        <p className="flex items-center gap-2 font-semibold">
          <Calendar size={18} className="text-accent-text" /> What happens next
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink-2">
          <li>Check your email. You and your parent each got a copy of the request.</li>
          <li>Your tutor accepts or declines, usually within a day.</li>
          <li>If they accept, pay from the link in the email to confirm.</li>
        </ol>
      </div>
      {preview ? (
        <p className="mt-6 text-sm text-muted">Preview mode: this request wasn&apos;t saved.</p>
      ) : (
        <Link href={`/booking/${done.token}`} className="btn btn-primary btn-lg mt-8">
          View your request
        </Link>
      )}
    </div>
  );
}
