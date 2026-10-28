/**
 * Money panel math. All money goes to one place and is split equally among
 * the founders. Amounts are integer cents; nothing here touches floats.
 */

import { addDays, addMonths, localDate, startOfMonth, startOfWeek, zonedToUtc, TZ } from "@/lib/time";
import type { Booking } from "@/lib/types";

export type PeriodKind = "week" | "month" | "all";

export type Period = {
  kind: PeriodKind;
  /** Inclusive start (UTC), null for all time. */
  start: Date | null;
  /** Exclusive end (UTC), null for all time. */
  end: Date | null;
  label: string;
};

export function periodFor(kind: PeriodKind, now: Date, tz: string = TZ): Period {
  if (kind === "all") return { kind, start: null, end: null, label: "All time" };
  const today = localDate(now, tz);
  if (kind === "week") {
    const from = startOfWeek(today);
    return {
      kind,
      start: zonedToUtc(from, 0, tz),
      end: zonedToUtc(addDays(from, 7), 0, tz),
      label: "This week",
    };
  }
  const from = startOfMonth(today);
  return {
    kind,
    start: zonedToUtc(from, 0, tz),
    end: zonedToUtc(addMonths(from, 1), 0, tz),
    label: "This month",
  };
}

export function inPeriod(iso: string | null, period: Period): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (period.start && t < period.start.getTime()) return false;
  if (period.end && t >= period.end.getTime()) return false;
  return true;
}

/**
 * Splits `total` cents into `n` shares that differ by at most one cent and
 * add back up to exactly `total`. Earlier shares get the extra cents.
 */
export function splitEvenly(total: number, n: number): number[] {
  if (!Number.isInteger(total)) throw new Error("total must be whole cents");
  if (!Number.isInteger(n) || n <= 0) throw new Error("n must be a positive integer");
  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);
  const base = Math.floor(abs / n);
  const remainder = abs - base * n;
  return Array.from({ length: n }, (_, i) => sign * (base + (i < remainder ? 1 : 0)));
}

type MoneyBooking = Pick<
  Booking,
  "tutorId" | "status" | "startAt" | "durationMinutes" | "amountPaidCents" | "feeCents" | "refundedCents"
>;

type MoneyTutor = { id: string; name: string; active: boolean };

export type TutorMoney = {
  tutorId: string;
  name: string;
  sessions: number;
  minutes: number;
  /** Net money from this tutor's own sessions. */
  earnedCents: number;
  /** This tutor's equal share of the period's net. */
  shareCents: number;
};

export type MoneySummary = {
  grossCents: number;
  feesCents: number;
  refundsCents: number;
  netCents: number;
  sessions: number;
  perTutor: TutorMoney[];
};

/**
 * Bookings count in the period of their session start. A booking counts as
 * revenue if money was collected, even if it was later cancelled late with no
 * refund. Sessions count only when confirmed (paid and not cancelled).
 */
export function summarizeMoney(params: {
  bookings: MoneyBooking[];
  tutors: MoneyTutor[];
  period: Period;
}): MoneySummary {
  const { period } = params;
  const founders = params.tutors.filter((t) => t.active);
  const rows = new Map<string, TutorMoney>(
    params.tutors.map((t) => [
      t.id,
      { tutorId: t.id, name: t.name, sessions: 0, minutes: 0, earnedCents: 0, shareCents: 0 },
    ]),
  );

  let gross = 0;
  let fees = 0;
  let refunds = 0;
  let sessions = 0;

  for (const b of params.bookings) {
    if (!inPeriod(b.startAt, period)) continue;
    const row = b.tutorId ? rows.get(b.tutorId) : undefined;
    if (b.amountPaidCents > 0) {
      gross += b.amountPaidCents;
      fees += b.feeCents;
      refunds += b.refundedCents;
      if (row) row.earnedCents += b.amountPaidCents - b.feeCents - b.refundedCents;
    }
    if (b.status === "confirmed") {
      sessions += 1;
      if (row) {
        row.sessions += 1;
        row.minutes += b.durationMinutes;
      }
    }
  }

  const net = gross - fees - refunds;
  const shares = founders.length > 0 ? splitEvenly(net, founders.length) : [];
  founders.forEach((t, i) => {
    const row = rows.get(t.id);
    if (row) row.shareCents = shares[i];
  });

  return {
    grossCents: gross,
    feesCents: fees,
    refundsCents: refunds,
    netCents: net,
    sessions,
    perTutor: params.tutors.map((t) => rows.get(t.id)!),
  };
}

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toLocaleString("en-US", {
    minimumFractionDigits: abs % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
