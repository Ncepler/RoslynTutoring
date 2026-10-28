import { describe, expect, it } from "vitest";
import { computeSlots, publicSlots, type SlotQuery } from "./slots";
import type { AvailabilityWindow } from "@/lib/types";

const rules: SlotQuery["rules"] = {
  earliestStartMinute: 15 * 60 + 30,
  latestEndMinute: 21 * 60,
  slotStepMinutes: 30,
  daysAhead: 7,
  minLeadHours: 6,
  allowWeekends: false,
};

const GEOMETRY = "geo";
const SPANISH = "spa";

const tutors = [
  { id: "noah", active: true, subjectIds: [GEOMETRY] },
  { id: "alex", active: true, subjectIds: [GEOMETRY, SPANISH] },
  { id: "gone", active: false, subjectIds: [GEOMETRY] },
];

function window(tutorId: string, weekday: number, start: string, end: string): AvailabilityWindow {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  return { id: `${tutorId}-${weekday}-${start}`, tutorId, weekday, startMinute: toMin(start), endMinute: toMin(end) };
}

// Monday Nov 2 2026, 9:00 AM New York (EST, UTC-5)
const MONDAY_9AM = new Date("2026-11-02T14:00:00Z");

function base(overrides: Partial<SlotQuery> = {}): SlotQuery {
  return {
    subjectId: GEOMETRY,
    durationMinutes: 30,
    now: MONDAY_9AM,
    tutors,
    availability: [window("noah", 1, "15:30", "17:00")],
    busy: [],
    rules,
    ...overrides,
  };
}

describe("computeSlots", () => {
  it("lists every 30-minute start inside a window", () => {
    const slots = computeSlots(base());
    const monday = slots.filter((s) => s.date === "2026-11-02");
    expect(monday.map((s) => s.minute)).toEqual([930, 960, 990]);
    // 3:30 PM EST is 20:30 UTC.
    expect(monday[0].start).toBe("2026-11-02T20:30:00.000Z");
    expect(monday[0].tutorIds).toEqual(["noah"]);
  });

  it("only offers 60-minute sessions that fit before the window ends", () => {
    const slots = computeSlots(base({ durationMinutes: 60 }));
    expect(slots.filter((s) => s.date === "2026-11-02").map((s) => s.minute)).toEqual([930, 960]);
  });

  it("never starts before 3:30 PM, even if availability says so", () => {
    const slots = computeSlots(base({ availability: [window("noah", 1, "14:00", "16:30")] }));
    expect(slots.filter((s) => s.date === "2026-11-02").map((s) => s.minute)).toEqual([930, 960]);
  });

  it("never runs past the latest end time", () => {
    const slots = computeSlots(base({ availability: [window("noah", 1, "20:00", "23:00")], durationMinutes: 60 }));
    expect(slots.filter((s) => s.date === "2026-11-02").map((s) => s.minute)).toEqual([1200]);
  });

  it("snaps odd window starts to the 30-minute grid", () => {
    const slots = computeSlots(base({ availability: [window("noah", 1, "15:45", "17:00")] }));
    expect(slots.filter((s) => s.date === "2026-11-02").map((s) => s.minute)).toEqual([960, 990]);
  });

  it("respects the minimum notice", () => {
    // 1 PM Monday: with 6 hours notice, the earliest start is 7 PM.
    const slots = computeSlots(
      base({ now: new Date("2026-11-02T18:00:00Z"), availability: [window("noah", 1, "15:30", "20:00")] }),
    );
    expect(slots.filter((s) => s.date === "2026-11-02").map((s) => s.minute)).toEqual([1140, 1170]);
  });

  it("skips weekends unless allowed", () => {
    const sat = [window("noah", 6, "15:30", "16:30")];
    expect(computeSlots(base({ availability: sat }))).toEqual([]);
    const allowed = computeSlots(base({ availability: sat, rules: { ...rules, allowWeekends: true } }));
    expect(allowed.map((s) => s.date)).toEqual(["2026-11-07", "2026-11-07"]);
  });

  it("removes times that overlap an existing booking", () => {
    const busy = [
      { tutorId: "noah", start: new Date("2026-11-02T21:00:00Z"), end: new Date("2026-11-02T21:30:00Z") },
    ];
    const slots = computeSlots(base({ busy, durationMinutes: 60 }));
    // 3:30-4:30 overlaps 4:00-4:30, 4:00-5:00 overlaps too.
    expect(slots.filter((s) => s.date === "2026-11-02")).toEqual([]);
  });

  it("lets back-to-back sessions through", () => {
    const busy = [
      { tutorId: "noah", start: new Date("2026-11-02T20:30:00Z"), end: new Date("2026-11-02T21:00:00Z") },
    ];
    const slots = computeSlots(base({ busy }));
    expect(slots.filter((s) => s.date === "2026-11-02").map((s) => s.minute)).toEqual([960, 990]);
  });

  it("merges tutors who are free at the same time", () => {
    const slots = computeSlots(
      base({ availability: [window("noah", 1, "15:30", "16:00"), window("alex", 1, "15:30", "16:00")] }),
    );
    expect(slots[0].tutorIds.sort()).toEqual(["alex", "noah"]);
  });

  it("ignores tutors who don't teach the subject or are inactive", () => {
    const slots = computeSlots(
      base({
        subjectId: SPANISH,
        availability: [window("noah", 1, "15:30", "16:00"), window("gone", 1, "15:30", "16:00")],
      }),
    );
    expect(slots).toEqual([]);
  });

  it("returns nothing when no tutor teaches the subject", () => {
    expect(computeSlots(base({ subjectId: "living-environment" }))).toEqual([]);
  });

  it("only looks daysAhead into the future", () => {
    const slots = computeSlots(base({ rules: { ...rules, daysAhead: 14 } }));
    expect(new Set(slots.map((s) => s.date))).toEqual(new Set(["2026-11-02", "2026-11-09"]));
  });

  it("strips tutor ids from the public view", () => {
    const [first] = publicSlots(computeSlots(base()));
    expect(first).toEqual({ start: "2026-11-02T20:30:00.000Z", date: "2026-11-02", minute: 930 });
    expect(first).not.toHaveProperty("tutorIds");
  });
});
