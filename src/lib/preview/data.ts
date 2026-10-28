/**
 * Sample data for preview mode (no Supabase connected). Lets the whole site
 * and dashboard render locally before the database exists. Nothing here is
 * real, and a banner says so whenever it's in use. Times are relative to
 * today so the preview always looks current.
 */

import { claimDeadline } from "@/lib/booking/policy";
import { addDays, localDate, weekdayOf, zonedToUtc } from "@/lib/time";
import type {
  AvailabilityWindow,
  Booking,
  BookingStatus,
  Report,
  Student,
  Subject,
  TestEvent,
  Tutor,
  TutorPrivate,
} from "@/lib/types";

export const previewSubjects: Subject[] = [
  { id: "sub-algebra-1", slug: "algebra-1", name: "Algebra 1", hasHonors: true, active: true, sortOrder: 10 },
  { id: "sub-geometry", slug: "geometry", name: "Geometry", hasHonors: true, active: true, sortOrder: 20 },
  { id: "sub-algebra-2", slug: "algebra-2", name: "Algebra 2", hasHonors: true, active: true, sortOrder: 30 },
  { id: "sub-chemistry", slug: "chemistry", name: "Chemistry", hasHonors: true, active: true, sortOrder: 40 },
  {
    id: "sub-living-environment",
    slug: "living-environment",
    name: "Living Environment",
    hasHonors: true,
    active: true,
    sortOrder: 50,
  },
  { id: "sub-spanish", slug: "spanish", name: "Spanish", hasHonors: true, active: true, sortOrder: 60 },
];

export const previewTutors: Tutor[] = [
  {
    id: "tut-noah",
    firstName: "Noah",
    lastName: "Cepler",
    grade: 11,
    active: true,
    sortOrder: 10,
    subjectIds: ["sub-geometry", "sub-algebra-1", "sub-algebra-2"],
  },
  {
    id: "tut-alex",
    firstName: "Alex",
    lastName: "Schlanger",
    grade: 11,
    active: true,
    sortOrder: 20,
    subjectIds: ["sub-algebra-1", "sub-algebra-2", "sub-geometry", "sub-chemistry", "sub-spanish"],
  },
  { id: "tut-tyler", firstName: "Tyler", lastName: "Shi", grade: null, active: true, sortOrder: 30, subjectIds: ["sub-spanish"] },
  { id: "tut-brody", firstName: "Brody", lastName: "Konigsberg", grade: null, active: true, sortOrder: 40, subjectIds: [] },
];

export const previewTutorPrivate: TutorPrivate[] = previewTutors.map((t) => ({
  tutorId: t.id,
  email: `${t.firstName.toLowerCase()}@example.com`,
  zoomLink: t.firstName === "Noah" ? "https://zoom.us/j/0000000000" : null,
  calendarId: null,
}));

const hm = (h: number, m = 0) => h * 60 + m;

export const previewAvailability: AvailabilityWindow[] = [
  { id: "av-1", tutorId: "tut-noah", weekday: 1, startMinute: hm(15, 30), endMinute: hm(18, 30) },
  { id: "av-2", tutorId: "tut-noah", weekday: 3, startMinute: hm(15, 30), endMinute: hm(18, 30) },
  { id: "av-3", tutorId: "tut-noah", weekday: 4, startMinute: hm(16), endMinute: hm(19) },
  { id: "av-4", tutorId: "tut-alex", weekday: 2, startMinute: hm(15, 30), endMinute: hm(19) },
  { id: "av-5", tutorId: "tut-alex", weekday: 4, startMinute: hm(15, 30), endMinute: hm(19) },
  { id: "av-6", tutorId: "tut-alex", weekday: 5, startMinute: hm(15, 30), endMinute: hm(17) },
  { id: "av-7", tutorId: "tut-tyler", weekday: 1, startMinute: hm(16), endMinute: hm(18) },
  { id: "av-8", tutorId: "tut-tyler", weekday: 3, startMinute: hm(16), endMinute: hm(18) },
];

export function previewTests(now: Date): TestEvent[] {
  const today = localDate(now);
  return [
    { id: "test-1", subjectId: "sub-algebra-1", course: "Algebra 1: Unit 3 test", level: null, testDate: addDays(today, 6) },
    { id: "test-2", subjectId: "sub-geometry", course: "Geometry Honors: Chapter 4 test", level: "honors", testDate: addDays(today, 9) },
    { id: "test-3", subjectId: "sub-spanish", course: "Spanish 2: Unit 2 exam", level: null, testDate: addDays(today, 13) },
  ];
}

const students: Student[] = [
  ["stu-1", "Maya", "Levin", 9],
  ["stu-2", "Ethan", "Park", 10],
  ["stu-3", "Sophie", "Chen", 8],
  ["stu-4", "Lucas", "Rivera", 10],
  ["stu-5", "Ava", "Goldberg", 9],
  ["stu-6", "Jack", "Weiss", 9],
].map(([id, firstName, lastName, grade]) => ({
  id: id as string,
  firstName: firstName as string,
  lastName: lastName as string,
  grade: grade as number,
  email: `${String(firstName).toLowerCase()}@example.com`,
  parentName: `Parent of ${firstName}`,
  parentEmail: `parent.${String(firstName).toLowerCase()}@example.com`,
  createdAt: "2026-09-01T12:00:00.000Z",
}));

export const previewStudents = students;

type Seed = {
  id: string;
  student: string;
  subject: string;
  tutor: string;
  status: BookingStatus;
  day: number;
  at: number;
  minutes: 30 | 60;
  createdDaysAgo: number;
  testId?: string;
};

const seeds: Seed[] = [
  { id: "bk-1", student: "stu-2", subject: "sub-geometry", tutor: "tut-noah", status: "pending", day: 1, at: hm(16, 30), minutes: 60, createdDaysAgo: 0, testId: "test-2" },
  { id: "bk-2", student: "stu-3", subject: "sub-spanish", tutor: "tut-tyler", status: "pending", day: 2, at: hm(16), minutes: 30, createdDaysAgo: 0, testId: "test-3" },
  { id: "bk-3", student: "stu-1", subject: "sub-algebra-1", tutor: "tut-alex", status: "awaiting_payment", day: 3, at: hm(15, 30), minutes: 60, createdDaysAgo: 1, testId: "test-1" },
  { id: "bk-4", student: "stu-4", subject: "sub-chemistry", tutor: "tut-alex", status: "confirmed", day: 4, at: hm(17), minutes: 60, createdDaysAgo: 2 },
  { id: "bk-5", student: "stu-5", subject: "sub-algebra-2", tutor: "tut-noah", status: "confirmed", day: 5, at: hm(16), minutes: 30, createdDaysAgo: 1 },
  { id: "bk-6", student: "stu-1", subject: "sub-algebra-1", tutor: "tut-noah", status: "confirmed", day: -3, at: hm(16), minutes: 60, createdDaysAgo: 6 },
  { id: "bk-7", student: "stu-2", subject: "sub-geometry", tutor: "tut-alex", status: "confirmed", day: -5, at: hm(17), minutes: 60, createdDaysAgo: 8 },
  { id: "bk-8", student: "stu-4", subject: "sub-chemistry", tutor: "tut-alex", status: "confirmed", day: -9, at: hm(16, 30), minutes: 60, createdDaysAgo: 12 },
  { id: "bk-9", student: "stu-6", subject: "sub-spanish", tutor: "tut-tyler", status: "confirmed", day: -12, at: hm(16), minutes: 30, createdDaysAgo: 14 },
  { id: "bk-10", student: "stu-5", subject: "sub-algebra-2", tutor: "tut-noah", status: "confirmed", day: -16, at: hm(15, 30), minutes: 60, createdDaysAgo: 19 },
  { id: "bk-11", student: "stu-3", subject: "sub-algebra-1", tutor: "tut-noah", status: "declined", day: -2, at: hm(18), minutes: 30, createdDaysAgo: 4 },
  { id: "bk-12", student: "stu-6", subject: "sub-geometry", tutor: "tut-alex", status: "expired", day: -6, at: hm(16), minutes: 60, createdDaysAgo: 9 },
  { id: "bk-13", student: "stu-1", subject: "sub-algebra-1", tutor: "tut-alex", status: "confirmed", day: -24, at: hm(16), minutes: 60, createdDaysAgo: 27 },
  { id: "bk-14", student: "stu-2", subject: "sub-algebra-2", tutor: "tut-noah", status: "cancelled", day: -1, at: hm(17), minutes: 60, createdDaysAgo: 5 },
];

function nextWeekday(date: string, minute: number): Date {
  let d = addDays(date, 1);
  while (weekdayOf(d) === 0 || weekdayOf(d) === 6) d = addDays(d, 1);
  return zonedToUtc(d, minute);
}

export function previewBookings(now: Date): Booking[] {
  const today = localDate(now);
  return seeds.map((s) => {
    // Sessions only happen on weekdays; nudge sample dates off weekends.
    let date = addDays(today, s.day);
    while (weekdayOf(date) === 0 || weekdayOf(date) === 6) date = addDays(date, s.day < 0 ? -1 : 1);
    const start = zonedToUtc(date, s.at);
    const end = new Date(start.getTime() + s.minutes * 60_000);
    const created = new Date(now.getTime() - s.createdDaysAgo * 86400_000 - 3 * 3600_000);
    const price = s.minutes === 60 ? 6000 : 4000;
    const paid = s.status === "confirmed" || s.id === "bk-14";
    const accepted = paid || s.status === "awaiting_payment";
    const fee = paid ? Math.round(price * 0.029) + 30 : 0;
    // Open, closed and expired requests were never claimed: no tutor, no fixed time.
    const unclaimed = s.status === "pending" || s.status === "declined" || s.status === "expired";
    const requestedStarts = unclaimed
      ? [start, new Date(start.getTime() + 3600_000), nextWeekday(date, s.at + 30)].map((d) => d.toISOString())
      : [start.toISOString()];
    return {
      id: s.id,
      publicToken: `preview-${s.id}`,
      studentId: s.student,
      subjectId: s.subject,
      level: s.subject === "sub-geometry" ? "honors" : "regular",
      testId: s.testId ?? null,
      durationMinutes: s.minutes,
      requestedStarts,
      startAt: unclaimed ? null : start.toISOString(),
      endAt: unclaimed ? null : end.toISOString(),
      tutorId: unclaimed ? null : s.tutor,
      claimDeadline: unclaimed ? claimDeadline(requestedStarts).toISOString() : null,
      status: s.status,
      priceCents: price,
      holdExpiresAt: s.status === "awaiting_payment" ? new Date(now.getTime() + 20 * 3600_000).toISOString() : null,
      stripeCheckoutSessionId: null,
      stripeCheckoutUrl: null,
      stripePaymentIntentId: null,
      amountPaidCents: paid ? price : 0,
      feeCents: fee,
      refundedCents: s.id === "bk-14" ? price : 0,
      acceptedAt: accepted ? new Date(created.getTime() + 2 * 3600_000).toISOString() : null,
      declinedAt: s.status === "declined" ? new Date(created.getTime() + 3600_000).toISOString() : null,
      paidAt: paid ? new Date(created.getTime() + 4 * 3600_000).toISOString() : null,
      cancelledAt: s.status === "cancelled" ? new Date(created.getTime() + 86400_000).toISOString() : null,
      expiredAt: s.status === "expired" ? start.toISOString() : null,
      respondedBy: accepted ? s.tutor : null,
      cancelledBy: s.status === "cancelled" ? "student" : null,
      cancelReason: null,
      googleEventId: null,
      reminderSentAt: null,
      createdAt: created.toISOString(),
    };
  });
}

export function previewReports(now: Date): Report[] {
  return [
    {
      id: "rep-1",
      name: "",
      email: "",
      topic: "website",
      message: "Sample report: the times list took a second to load on my phone.",
      page: "/book",
      resolvedAt: null,
      createdAt: new Date(now.getTime() - 2 * 86400_000).toISOString(),
    },
  ];
}
