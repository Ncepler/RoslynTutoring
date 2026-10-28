import { describe, expect, it } from "vitest";
import { assignTutor, exclusionKey, pickTutor } from "./matching";
import type { Slot } from "./slots";

const order = ["noah", "alex", "tyler", "brody"];

const slot = (start: string, tutorIds: string[]): Slot => ({ start, date: start.slice(0, 10), minute: 0, tutorIds });

describe("pickTutor", () => {
  it("picks whoever has the fewest sessions this period", () => {
    const load = new Map([
      ["noah", 5],
      ["alex", 2],
    ]);
    expect(pickTutor(["noah", "alex"], load, order)).toBe("alex");
  });

  it("treats tutors with no sessions as zero", () => {
    expect(pickTutor(["noah", "tyler"], new Map([["noah", 1]]), order)).toBe("tyler");
  });

  it("breaks ties with the stable founder order", () => {
    expect(pickTutor(["alex", "noah"], new Map(), order)).toBe("noah");
  });

  it("returns null when nobody is free", () => {
    expect(pickTutor([], new Map(), order)).toBeNull();
  });
});

describe("assignTutor", () => {
  const slots = [
    slot("2026-11-02T20:30:00.000Z", ["noah"]),
    slot("2026-11-03T21:00:00.000Z", ["noah", "alex"]),
  ];

  it("uses the first preference that has a free tutor", () => {
    const result = assignTutor({
      preferences: ["2026-11-02T20:30:00.000Z", "2026-11-03T21:00:00.000Z"],
      slots,
      load: new Map(),
      order,
    });
    expect(result).toEqual({ start: "2026-11-02T20:30:00.000Z", tutorId: "noah", preferenceIndex: 0 });
  });

  it("falls through to later preferences when earlier ones are gone", () => {
    const result = assignTutor({
      preferences: ["2026-11-02T19:00:00.000Z", "2026-11-03T21:00:00.000Z"],
      slots,
      load: new Map([["noah", 3]]),
      order,
    });
    expect(result).toEqual({ start: "2026-11-03T21:00:00.000Z", tutorId: "alex", preferenceIndex: 1 });
  });

  it("matches preferences regardless of ISO formatting", () => {
    const result = assignTutor({
      preferences: ["2026-11-02T15:30:00-05:00"],
      slots,
      load: new Map(),
      order,
    });
    expect(result?.start).toBe("2026-11-02T20:30:00.000Z");
  });

  it("skips excluded tutor/time pairs after losing a race", () => {
    const result = assignTutor({
      preferences: ["2026-11-03T21:00:00.000Z"],
      slots,
      load: new Map(),
      order,
      exclude: new Set([exclusionKey("noah", "2026-11-03T21:00:00.000Z")]),
    });
    expect(result?.tutorId).toBe("alex");
  });

  it("returns null when no preference can be matched", () => {
    expect(assignTutor({ preferences: ["2026-12-01T20:30:00.000Z"], slots, load: new Map(), order })).toBeNull();
  });
});
