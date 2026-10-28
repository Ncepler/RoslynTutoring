"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, Calendar } from "@/components/icons";

export type HeroStackProps = {
  next: { course: string; subject: string; date: string; when: string; href: string } | null;
  subjects: { name: string; href: string }[];
  tutors: { first: string; initials: string }[];
  prices: { half: string; hour: string };
};

/** Critically damped: settles without bouncing, and stays interruptible. */
const SPRING = { stiffness: 110, damping: 22, mass: 0.6 };

function useDepth(x: MotionValue<number>, y: MotionValue<number>, depth: number) {
  return {
    x: useTransform(x, (v) => v * 14 * depth),
    y: useTransform(y, (v) => v * 10 * depth),
  };
}

/**
 * The signature element: three code-built cards stacked with real overlap,
 * shadow and scale differences. On a desktop pointer the layers drift at
 * different depths; on touch and with reduced motion they stay still.
 */
export function HeroStack({ next, subjects, tutors, prices }: HeroStackProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, SPRING);
  const sy = useSpring(py, SPRING);

  const back = useDepth(sx, sy, -0.35);
  const middle = useDepth(sx, sy, -0.65);
  const front = useDepth(sx, sy, -1);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches) return;

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {
        px.set(0);
        py.set(0);
      }
    });
    io.observe(el);

    const onMove = (e: PointerEvent) => {
      if (!visible || e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      // -1..1 from the stack's centre, clamped so far-away pointers don't over-drive it.
      const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
      px.set(nx);
      py.set(ny);
    };
    const onLeave = () => {
      px.set(0);
      py.set(0);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [reduce, px, py]);

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[26rem] lg:mr-0 lg:h-[29rem] lg:max-w-[28rem]">
      {/* Back: price. Smallest and softest, furthest away. */}
      <motion.div style={back} className="absolute top-0 right-0 hidden w-[15rem] lg:block">
        <div className="enter" style={{ "--i": 4 } as React.CSSProperties}>
          <div className="card origin-top-right scale-[0.94] px-5 pt-5 pb-10">
            <p className="t-label">Pricing</p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="tabular text-[2.25rem] leading-none font-[650] tracking-[-0.04em]">{prices.half}</span>
              <span className="text-sm text-muted">/ 30 min</span>
            </p>
            <p className="mt-1.5 text-sm text-ink-2">
              <span className="tabular font-semibold">{prices.hour}</span> for a full hour
            </p>
          </div>
        </div>
      </motion.div>

      {/* Middle: who you'll work with. */}
      <motion.div style={middle} className="absolute top-[7.25rem] left-0 hidden w-[17.5rem] lg:block">
        <div className="enter" style={{ "--i": 5 } as React.CSSProperties}>
          <TutorsCard tutors={tutors} />
        </div>
      </motion.div>

      {/* Front: the next real test on the schedule, or the subjects if none are posted. */}
      <motion.div style={front} className="relative lg:absolute lg:right-3 lg:bottom-0 lg:w-[21rem]">
        <div className="enter" style={{ "--i": 6 } as React.CSSProperties}>
          {/* On phones the tutors card peeks out behind the front card for depth. */}
          <div aria-hidden="true" className="absolute inset-x-4 -top-3 h-16 rounded-[22px] border border-line bg-surface-2 lg:hidden" />
          <div className="card relative p-5 shadow-[var(--shadow-float)] sm:p-6">
            {next ? <NextTest next={next} /> : <PickSubject subjects={subjects} />}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function NextTest({ next }: { next: NonNullable<HeroStackProps["next"]> }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="t-label inline-flex items-center gap-1.5">
          <Calendar size={15} />
          Next test on the schedule
        </p>
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-soft-ink">
          {next.when}
        </span>
      </div>
      <p className="mt-4 text-[1.375rem] leading-tight font-[650] tracking-[-0.025em] text-balance">{next.course}</p>
      <p className="mt-1.5 text-sm text-muted">
        {next.subject} · {next.date}
      </p>
      <Link href={next.href} className="btn btn-primary mt-5 w-full">
        Book a review for it
        <ArrowRight size={17} />
      </Link>
    </>
  );
}

function PickSubject({ subjects }: { subjects: HeroStackProps["subjects"] }) {
  return (
    <>
      <p className="t-label">Pick a subject to see open times</p>
      <ul className="mt-3 divide-y divide-line">
        {subjects.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="flex min-h-12 items-center justify-between text-[1.0625rem] font-medium">
              {s.name}
              <ArrowRight size={17} className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function TutorsCard({ tutors }: { tutors: HeroStackProps["tutors"] }) {
  const names = tutors.map((t) => t.first);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
  return (
    <div className="card px-5 pt-5 pb-10">
      <div className="flex -space-x-2">
        {tutors.map((t, i) => (
          <span
            key={t.initials + i}
            className="grid size-10 place-items-center rounded-full border-2 border-surface bg-accent-soft text-[0.8125rem] font-semibold tracking-[-0.01em] text-accent-soft-ink"
          >
            {t.initials}
          </span>
        ))}
      </div>
      <p className="mt-3 font-semibold tracking-[-0.015em]">{list}</p>
      <p className="mt-1 text-sm leading-snug text-muted">Every tutor is one of the founders.</p>
    </div>
  );
}
