import { describe, expect, it } from "vitest";
import { claimOptions, freeTutorsByTime } from "./claim";
import { canClaim, canClose, claimDeadline, effectiveStatus } from "./policy";
import type { AvailabilityWindow } from "@/lib/types";

// Monday Nov 2 2026, 9:00 AM New York (EST, UTC-5)
const now = new Date("2026-11-02T14:00:00Z");
const MON_330 = "2026-11-02T20:30:00.000Z"; // Mon 3:30 PM
const MON_430 = "2026-11-02T21:30:00.000Z"; // Mon 4:30 PM
const TUE_400 = "2026-11-03T21:00:00.000Z"; // Tue 4:00 PM

const noahHours: AvailabilityWindow[] = [
  { id: "a", tutorId: "noah", weekday: 1, startMinute: 15 * 60 + 30, endMinute: 17 * 60 },
];

describe("claimOptions", () => {
  it("lists every preferred time, in order", () => {
    const opts = claimOptions({
      tutorId: "noah",
      requestedStarts: [MON_330, TUE_400],
      durationMinutes: 60,
      now,
      busy: [],
      availability: noahHours,
    });
    expect(opts.map((o) => o.start)).toEqual([MON_330, TUE_400]);
    expect(opts[0]).toMatchObject({ claimable: true, reason: null, outsideHours: false, end: "2026-11-02T21:30:00.000Z" });
  });

  it("blocks a time that clashes with the founder's own session", () => {
    const [opt] = claimOptions({
      tutorId: "noah",
      requestedStarts: [MON_330],
      durationMinutes: 60,
      now,
      busy: [{ tutorId: "noah", start: new Date(MON_430), end: new Date("2026-11-02T22:00:00Z") }],
      availability: noahHours,
    });
    expect(opt.claimable).toBe(true); // 3:30-4:30 ends as 4:30 starts

    const [clash] = claimOptions({
      tutorId: "noah",
      requestedStarts: [MON_430],
      durationMinutes: 60,
      now,
      busy: [{ tutorId: "noah", start: new Date("2026-11-02T22:00:00Z"), end: new Date("2026-11-02T23:00:00Z") }],
      availability: noahHours,
    });
    expect(clash).toMatchObject({ claimable: false, reason: "You have a session then" });
  });

  it("ignores other founders' sessions", () => {
    const [opt] = claimOptions({
      tutorId: "noah",
      requestedStarts: [MON_330],
      durationMinutes: 60,
      now,
      busy: [{ tutorId: "alex", start: new Date(MON_330), end: new Date(MON_430) }],
      availability: noahHours,
    });
    expect(opt.claimable).toBe(true);
  });

  it("flags times outside the founder's weekly hours without blocking them", () => {
    const [opt] = claimOptions({
      tutorId: "noah",
      requestedStarts: [TUE_400],
      durationMinutes: 30,
      now,
      busy: [],
      availability: noahHours,
    });
    expect(opt).toMatchObject({ claimable: true, outsideHours: true });
  });

  it("blocks times too soon to leave time for payment", () => {
    const [opt] = claimOptions({
      tutorId: "noah",
      requestedStarts: [MON_330],
      durationMinutes: 30,
      now: new Date("2026-11-02T19:15:00Z"), // 2:15 PM, 75 minutes before
      busy: [],
      availability: noahHours,
    });
    expect(opt).toMatchObject({ claimable: false, reason: "Too soon to leave time to pay" });
  });
});

describe("canClaim / canClose", () => {
  const open = { status: "pending" as const, tutorId: null, requestedStarts: [MON_330, TUE_400] };

  it("allows claiming one of the student's times", () => {
    expect(canClaim(open, TUE_400, now)).toEqual({ ok: true });
    expect(canClaim(open, "2026-11-03T16:00:00-05:00", now)).toEqual({ ok: true }); // same instant, other format
  });

  it("refuses a time the student didn't pick", () => {
    expect(canClaim(open, "2026-11-04T21:00:00Z", now).ok).toBe(false);
  });

  it("refuses a request someone already claimed", () => {
    const r = canClaim({ ...open, tutorId: "alex" }, TUE_400, now);
    expect(r).toEqual({ ok: false, reason: "Someone already claimed this request." });
  });

  it("refuses closed requests", () => {
    expect(canClaim({ ...open, status: "declined" }, TUE_400, now).ok).toBe(false);
    expect(canClose({ status: "pending", tutorId: null }).ok).toBe(true);
    expect(canClose({ status: "awaiting_payment", tutorId: "noah" }).ok).toBe(false);
  });
});

describe("claimDeadline", () => {
  it("is 90 minutes before the latest preferred time", () => {
    expect(claimDeadline([TUE_400, MON_330]).toISOString()).toBe("2026-11-03T19:30:00.000Z");
  });

  it("drives expiry of open requests", () => {
    const deadline = claimDeadline([MON_330]).toISOString();
    expect(effectiveStatus({ status: "pending", claimDeadline: deadline, holdExpiresAt: null }, now)).toBe("pending");
    expect(
      effectiveStatus({ status: "pending", claimDeadline: deadline, holdExpiresAt: null }, new Date("2026-11-02T19:00:00Z")),
    ).toBe("expired");
  });
});

describe("freeTutorsByTime", () => {
  it("maps each preferred time to whoever is free then", () => {
    const map = freeTutorsByTime(
      [MON_330, TUE_400],
      [{ start: MON_330, tutorIds: ["noah", "alex"] }],
    );
    expect(map.get(MON_330)).toEqual(["noah", "alex"]);
    expect(map.get(TUE_400)).toEqual([]);
  });
});
