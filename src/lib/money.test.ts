import { describe, expect, it } from "vitest";
import { formatCents, periodFor, splitEvenly, summarizeMoney } from "./money";
import type { BookingStatus } from "./types";

describe("splitEvenly", () => {
  it("splits evenly when it divides", () => {
    expect(splitEvenly(24000, 4)).toEqual([6000, 6000, 6000, 6000]);
  });

  it("hands leftover cents to the first people and always adds back up", () => {
    const shares = splitEvenly(10003, 4);
    expect(shares).toEqual([2501, 2501, 2501, 2500]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(10003);
  });

  it("handles negative totals (a refund in a quiet period)", () => {
    const shares = splitEvenly(-1001, 4);
    expect(shares).toEqual([-251, -250, -250, -250]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(-1001);
  });

  it("handles zero", () => {
    expect(splitEvenly(0, 4)).toEqual([0, 0, 0, 0]);
  });

  it("rejects fractional cents and empty groups", () => {
    expect(() => splitEvenly(10.5, 4)).toThrow();
    expect(() => splitEvenly(100, 0)).toThrow();
  });
});

describe("periodFor", () => {
  const now = new Date("2026-10-28T16:00:00Z"); // Wed Oct 28, noon in New York

  it("uses Monday-to-Monday weeks in New York time", () => {
    const p = periodFor("week", now);
    expect(p.start?.toISOString()).toBe("2026-10-26T04:00:00.000Z");
    // The week ends after the clocks fall back, so midnight is UTC-5.
    expect(p.end?.toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });

  it("uses calendar months in New York time", () => {
    const p = periodFor("month", now);
    expect(p.start?.toISOString()).toBe("2026-10-01T04:00:00.000Z");
    expect(p.end?.toISOString()).toBe("2026-11-01T04:00:00.000Z");
  });

  it("has no bounds for all time", () => {
    expect(periodFor("all", now)).toMatchObject({ start: null, end: null });
  });
});

type B = Parameters<typeof summarizeMoney>[0]["bookings"][number];

const booking = (over: Partial<B>): B => ({
  tutorId: "noah",
  status: "confirmed" as BookingStatus,
  startAt: "2026-10-20T20:30:00Z",
  durationMinutes: 60,
  amountPaidCents: 6000,
  feeCents: 204,
  refundedCents: 0,
  ...over,
});

const tutors = [
  { id: "noah", name: "Noah", active: true },
  { id: "alex", name: "Alex", active: true },
  { id: "tyler", name: "Tyler", active: true },
  { id: "brody", name: "Brody", active: true },
];

describe("summarizeMoney", () => {
  const october = periodFor("month", new Date("2026-10-28T16:00:00Z"));

  it("totals gross, fees and net, and splits net four ways", () => {
    const s = summarizeMoney({
      bookings: [
        booking({}),
        booking({ tutorId: "alex", durationMinutes: 30, amountPaidCents: 4000, feeCents: 146 }),
      ],
      tutors,
      period: october,
    });
    expect(s.grossCents).toBe(10000);
    expect(s.feesCents).toBe(350);
    expect(s.netCents).toBe(9650);
    expect(s.sessions).toBe(2);
    expect(s.perTutor.map((t) => t.shareCents)).toEqual([2413, 2413, 2412, 2412]);
    expect(s.perTutor.reduce((a, t) => a + t.shareCents, 0)).toBe(s.netCents);
    expect(s.perTutor.find((t) => t.tutorId === "noah")).toMatchObject({ sessions: 1, minutes: 60, earnedCents: 5796 });
    expect(s.perTutor.find((t) => t.tutorId === "brody")).toMatchObject({ sessions: 0, earnedCents: 0 });
  });

  it("counts late, unrefunded cancels as money but not as sessions", () => {
    const s = summarizeMoney({
      bookings: [booking({ status: "cancelled" })],
      tutors,
      period: october,
    });
    expect(s.grossCents).toBe(6000);
    expect(s.sessions).toBe(0);
  });

  it("subtracts refunds", () => {
    const s = summarizeMoney({
      bookings: [booking({ status: "cancelled", refundedCents: 6000 })],
      tutors,
      period: october,
    });
    expect(s.netCents).toBe(-204);
  });

  it("ignores unpaid requests and sessions outside the period", () => {
    const s = summarizeMoney({
      bookings: [
        booking({ status: "pending", amountPaidCents: 0, feeCents: 0 }),
        booking({ startAt: "2026-11-03T20:30:00Z" }),
      ],
      tutors,
      period: october,
    });
    expect(s.grossCents).toBe(0);
    expect(s.sessions).toBe(0);
  });

  it("only splits among active founders", () => {
    const s = summarizeMoney({
      bookings: [booking({})],
      tutors: [...tutors.slice(0, 3), { id: "brody", name: "Brody", active: false }],
      period: october,
    });
    expect(s.perTutor.map((t) => t.shareCents)).toEqual([1932, 1932, 1932, 0]);
  });
});

describe("formatCents", () => {
  it("formats dollars", () => {
    expect(formatCents(6000)).toBe("$60");
    expect(formatCents(123456)).toBe("$1,234.56");
    expect(formatCents(-204)).toBe("-$2.04");
  });
});
