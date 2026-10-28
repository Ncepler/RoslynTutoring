import { describe, expect, it } from "vitest";
import { computeAnalytics, rate } from "./analytics";
import { periodFor } from "./money";

type B = Parameters<typeof computeAnalytics>[0]["bookings"][number];

const now = new Date("2026-10-28T16:00:00Z");
const october = periodFor("month", now);

const b = (over: Partial<B>): B => ({
  studentId: "s1",
  subjectId: "geo",
  tutorId: "noah",
  status: "confirmed",
  testId: null,
  startAt: "2026-10-20T20:30:00Z",
  durationMinutes: 60,
  createdAt: "2026-10-18T12:00:00Z",
  acceptedAt: "2026-10-18T15:00:00Z",
  paidAt: "2026-10-18T16:00:00Z",
  ...over,
});

describe("computeAnalytics", () => {
  const bookings = [
    b({}),
    b({ startAt: "2026-10-27T20:30:00Z", createdAt: "2026-10-25T12:00:00Z", testId: "t1" }),
    b({ studentId: "s2", subjectId: "spa", status: "pending", acceptedAt: null, paidAt: null, testId: "t1" }),
    b({ studentId: "s3", status: "declined", acceptedAt: null, paidAt: null, createdAt: "2026-09-10T12:00:00Z" }),
  ];
  const tests = [{ id: "t1", testDate: "2026-10-28" }];
  const a = computeAnalytics({ bookings, tests, period: october, now });

  it("counts the request -> accepted -> paid funnel for the period", () => {
    expect(a.requests).toBe(3);
    expect(a.accepted).toBe(2);
    expect(a.paid).toBe(2);
  });

  it("counts new students by their first request", () => {
    expect(a.newStudents).toBe(2); // s1 and s2; s3 first asked in September
  });

  it("finds repeat students", () => {
    expect(a.repeatStudents).toBe(1);
    expect(a.repeatRate).toBe(1);
  });

  it("breaks requests down by subject", () => {
    expect(a.bySubject).toEqual([
      { subjectId: "geo", requests: 2, paid: 2 },
      { subjectId: "spa", requests: 1, paid: 0 },
    ]);
  });

  it("totals tutor minutes for sessions that already happened", () => {
    expect(a.tutorMinutes).toEqual([{ tutorId: "noah", minutes: 120 }]);
  });

  it("buckets how many days before a test students book", () => {
    const counts = Object.fromEntries(a.daysBeforeTest.map((x) => [x.label, x.count]));
    expect(counts["Day of / day before"]).toBe(1); // Oct 27 session, Oct 28 test
    expect(counts["8+ days"]).toBe(1); // Oct 20 session, Oct 28 test
  });

  it("builds an 8-week series ending this week", () => {
    expect(a.weekly).toHaveLength(8);
    expect(a.weekly[7].weekStart).toBe("2026-10-26");
    // Oct 18 and Oct 25 2026 are Sundays, so they close the weeks of Oct 12 and Oct 19.
    expect(a.weekly[5]).toMatchObject({ weekStart: "2026-10-12", requests: 2, paid: 1 });
    expect(a.weekly[6]).toMatchObject({ weekStart: "2026-10-19", requests: 1, paid: 1 });
  });
});

describe("rate", () => {
  it("formats percentages and handles empty", () => {
    expect(rate(1, 3)).toBe("33%");
    expect(rate(0, 0)).toBe("—");
  });
});
