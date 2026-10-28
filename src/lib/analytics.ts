/**
 * Analytics computed from our own database. No third-party trackers, since
 * our users are minors.
 */

import { daysBetween, localDate, startOfWeek, addDays, TZ } from "@/lib/time";
import { inPeriod, type Period } from "@/lib/money";
import type { Booking, TestEvent } from "@/lib/types";

type AnalyticsBooking = Pick<
  Booking,
  | "studentId"
  | "subjectId"
  | "tutorId"
  | "status"
  | "testId"
  | "startAt"
  | "durationMinutes"
  | "createdAt"
  | "acceptedAt"
  | "paidAt"
>;

export type DaysBeforeBucket = { label: string; min: number; max: number; count: number };

export type Analytics = {
  /** Students whose first-ever request falls in the period. */
  newStudents: number;
  requests: number;
  accepted: number;
  paid: number;
  /** Students with two or more paid sessions, ever. */
  repeatStudents: number;
  /** Share of paying students who came back, ever. */
  repeatRate: number | null;
  bySubject: { subjectId: string; requests: number; paid: number }[];
  tutorMinutes: { tutorId: string; minutes: number }[];
  daysBeforeTest: DaysBeforeBucket[];
  /** Requests per week for the last 8 weeks, oldest first. */
  weekly: { weekStart: string; requests: number; paid: number }[];
};

export const DAYS_BEFORE_BUCKETS: Omit<DaysBeforeBucket, "count">[] = [
  { label: "Day of / day before", min: 0, max: 1 },
  { label: "2 to 3 days", min: 2, max: 3 },
  { label: "4 to 7 days", min: 4, max: 7 },
  { label: "8+ days", min: 8, max: Number.POSITIVE_INFINITY },
];

export function computeAnalytics(params: {
  bookings: AnalyticsBooking[];
  tests: Pick<TestEvent, "id" | "testDate">[];
  period: Period;
  now: Date;
  tz?: string;
}): Analytics {
  const tz = params.tz ?? TZ;
  const { bookings, period } = params;

  // First request per student, across all time.
  const firstRequest = new Map<string, string>();
  for (const b of bookings) {
    const prev = firstRequest.get(b.studentId);
    if (!prev || b.createdAt < prev) firstRequest.set(b.studentId, b.createdAt);
  }
  let newStudents = 0;
  for (const created of firstRequest.values()) if (inPeriod(created, period)) newStudents++;

  const inRange = bookings.filter((b) => inPeriod(b.createdAt, period));
  const requests = inRange.length;
  const accepted = inRange.filter((b) => b.acceptedAt).length;
  const paid = inRange.filter((b) => b.paidAt).length;

  const paidPerStudent = new Map<string, number>();
  for (const b of bookings) {
    if (b.paidAt) paidPerStudent.set(b.studentId, (paidPerStudent.get(b.studentId) ?? 0) + 1);
  }
  const payingStudents = paidPerStudent.size;
  const repeatStudents = [...paidPerStudent.values()].filter((n) => n >= 2).length;

  const subjects = new Map<string, { requests: number; paid: number }>();
  for (const b of inRange) {
    const row = subjects.get(b.subjectId) ?? { requests: 0, paid: 0 };
    row.requests++;
    if (b.paidAt) row.paid++;
    subjects.set(b.subjectId, row);
  }

  // Tutor hours: confirmed sessions that have already happened.
  const minutes = new Map<string, number>();
  for (const b of bookings) {
    if (b.status !== "confirmed" || !inPeriod(b.startAt, period)) continue;
    if (new Date(b.startAt).getTime() > params.now.getTime()) continue;
    minutes.set(b.tutorId, (minutes.get(b.tutorId) ?? 0) + b.durationMinutes);
  }

  // How far ahead of a test students book (for requests tied to a test).
  const testDates = new Map(params.tests.map((t) => [t.id, t.testDate]));
  const buckets = DAYS_BEFORE_BUCKETS.map((b) => ({ ...b, count: 0 }));
  for (const b of inRange) {
    const testDate = b.testId ? testDates.get(b.testId) : undefined;
    if (!testDate) continue;
    const days = daysBetween(localDate(new Date(b.startAt), tz), testDate);
    if (days < 0) continue;
    const bucket = buckets.find((x) => days >= x.min && days <= x.max);
    if (bucket) bucket.count++;
  }

  const thisWeek = startOfWeek(localDate(params.now, tz));
  const weekly = Array.from({ length: 8 }, (_, i) => ({
    weekStart: addDays(thisWeek, (i - 7) * 7),
    requests: 0,
    paid: 0,
  }));
  for (const b of bookings) {
    const week = startOfWeek(localDate(new Date(b.createdAt), tz));
    const row = weekly.find((w) => w.weekStart === week);
    if (!row) continue;
    row.requests++;
    if (b.paidAt) row.paid++;
  }

  return {
    newStudents,
    requests,
    accepted,
    paid,
    repeatStudents,
    repeatRate: payingStudents > 0 ? repeatStudents / payingStudents : null,
    bySubject: [...subjects.entries()]
      .map(([subjectId, v]) => ({ subjectId, ...v }))
      .sort((a, b) => b.requests - a.requests),
    tutorMinutes: [...minutes.entries()].map(([tutorId, m]) => ({ tutorId, minutes: m })),
    daysBeforeTest: buckets,
    weekly,
  };
}

export function rate(part: number, whole: number): string {
  if (whole === 0) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}
