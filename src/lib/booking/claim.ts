/**
 * Claiming. A new request goes to every founder; whoever can take it claims
 * one of the student's preferred times. These helpers tell a founder which
 * of those times they can claim, and why not when they can't.
 */

import { bookingRules, type BookingRules } from "@/config/site";
import { localMinute, weekdayOf, localDate, TZ } from "@/lib/time";
import { HOLDING_STATUSES, type AvailabilityWindow, type Booking } from "@/lib/types";
import { claimCutoff, effectiveStatus } from "./policy";
import { isTutorBusy, type BusyInterval } from "./slots";

export type ClaimOption = {
  start: string;
  end: string;
  claimable: boolean;
  /** Why it can't be claimed. */
  reason: string | null;
  /** Claimable, but outside the founder's usual weekly hours. Just a heads-up. */
  outsideHours: boolean;
};

export function claimOptions(params: {
  tutorId: string;
  requestedStarts: string[];
  durationMinutes: number;
  now: Date;
  /** Everyone's booked time; only this tutor's entries matter. */
  busy: BusyInterval[];
  /** This tutor's weekly windows. */
  availability: AvailabilityWindow[];
  rules?: Pick<BookingRules, "holdEndsBeforeStartMinutes">;
  tz?: string;
}): ClaimOption[] {
  const tz = params.tz ?? TZ;
  const cutoff = claimCutoff(params.now, params.rules ?? bookingRules).getTime();
  return params.requestedStarts.map((iso) => {
    const start = new Date(iso);
    const end = new Date(start.getTime() + params.durationMinutes * 60_000);
    const minute = localMinute(start, tz);
    const weekday = weekdayOf(localDate(start, tz));
    const outsideHours = !params.availability.some(
      (w) =>
        w.tutorId === params.tutorId &&
        w.weekday === weekday &&
        w.startMinute <= minute &&
        minute + params.durationMinutes <= w.endMinute,
    );
    let reason: string | null = null;
    if (start.getTime() < cutoff) reason = "Too soon to leave time to pay";
    else if (isTutorBusy(params.busy, params.tutorId, start, end)) reason = "You have a session then";
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      claimable: reason === null,
      reason,
      outsideHours: reason === null && outsideHours,
    };
  });
}

/** For the new-request email: who is free at each of the student's times. */
export function freeTutorsByTime(
  requestedStarts: string[],
  slots: { start: string; tutorIds: string[] }[],
): Map<string, string[]> {
  const byStart = new Map(slots.map((s) => [new Date(s.start).toISOString(), s.tutorIds]));
  return new Map(requestedStarts.map((s) => [new Date(s).toISOString(), byStart.get(new Date(s).toISOString()) ?? []]));
}

/** Time already taken by claimed, still-active bookings. Open requests block nobody. */
export function busyFromBookings(bookings: Booking[], now: Date): BusyInterval[] {
  return bookings
    .filter((b) => b.tutorId && b.startAt && b.endAt && HOLDING_STATUSES.includes(effectiveStatus(b, now)))
    .map((b) => ({ tutorId: b.tutorId!, start: new Date(b.startAt!), end: new Date(b.endAt!) }));
}
