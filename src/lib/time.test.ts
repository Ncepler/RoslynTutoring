import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  daysBetween,
  formatMinute,
  localDate,
  localMinute,
  startOfWeek,
  tzOffsetMinutes,
  weekdayOf,
  zonedToUtc,
} from "./time";

describe("zonedToUtc", () => {
  it("converts New York wall time in daylight time (UTC-4)", () => {
    expect(zonedToUtc("2026-10-28", 15 * 60 + 30).toISOString()).toBe("2026-10-28T19:30:00.000Z");
  });

  it("converts New York wall time in standard time (UTC-5)", () => {
    expect(zonedToUtc("2026-12-01", 15 * 60 + 30).toISOString()).toBe("2026-12-01T20:30:00.000Z");
  });

  it("handles the day the clocks fall back", () => {
    // Nov 1 2026, 2:00 AM EDT -> 1:00 AM EST. Afternoons are unambiguous EST.
    expect(zonedToUtc("2026-11-01", 16 * 60).toISOString()).toBe("2026-11-01T21:00:00.000Z");
  });

  it("handles the day the clocks spring forward", () => {
    // Mar 8 2026. Afternoon is EDT.
    expect(zonedToUtc("2026-03-08", 16 * 60).toISOString()).toBe("2026-03-08T20:00:00.000Z");
  });

  it("round-trips through localDate and localMinute", () => {
    const d = zonedToUtc("2027-06-17", 17 * 60 + 30);
    expect(localDate(d)).toBe("2027-06-17");
    expect(localMinute(d)).toBe(17 * 60 + 30);
  });
});

describe("tzOffsetMinutes", () => {
  it("reports -240 in summer and -300 in winter for New York", () => {
    expect(tzOffsetMinutes(new Date("2026-07-01T12:00:00Z"))).toBe(-240);
    expect(tzOffsetMinutes(new Date("2026-01-15T12:00:00Z"))).toBe(-300);
  });
});

describe("localDate", () => {
  it("uses the New York date, not the UTC date", () => {
    // 01:00 UTC on Oct 29 is 9 PM Oct 28 in New York.
    expect(localDate(new Date("2026-10-29T01:00:00Z"))).toBe("2026-10-28");
  });
});

describe("date arithmetic", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("computes weekdays", () => {
    expect(weekdayOf("2026-10-28")).toBe(3); // Wednesday
    expect(weekdayOf("2026-11-01")).toBe(0); // Sunday
  });

  it("counts days between dates", () => {
    expect(daysBetween("2026-10-28", "2026-11-04")).toBe(7);
    expect(daysBetween("2026-11-04", "2026-10-28")).toBe(-7);
  });

  it("finds the Monday of the week", () => {
    expect(startOfWeek("2026-10-28")).toBe("2026-10-26");
    expect(startOfWeek("2026-11-01")).toBe("2026-10-26"); // Sunday belongs to the prior week
    expect(startOfWeek("2026-10-26")).toBe("2026-10-26");
  });

  it("adds months from the first of the month", () => {
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-01");
  });
});

describe("formatMinute", () => {
  it("formats afternoon times", () => {
    expect(formatMinute(930)).toBe("3:30 PM");
    expect(formatMinute(720)).toBe("12:00 PM");
    expect(formatMinute(0)).toBe("12:00 AM");
  });
});
