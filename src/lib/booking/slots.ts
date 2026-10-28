/**
 * Turns weekly tutor availability into concrete bookable start times.
 * Pure: no I/O, no clock. The caller passes `now`.
 */

import type { BookingRules } from "@/config/site";
import { addDays, localDate, weekdayOf, zonedToUtc, TZ } from "@/lib/time";
import type { AvailabilityWindow } from "@/lib/types";

export type BusyInterval = { tutorId: string; start: Date; end: Date };

export type SlotTutor = { id: string; active: boolean; subjectIds: string[] };

export type Slot = {
  /** UTC ISO start. */
  start: string;
  /** Local date, YYYY-MM-DD. */
  date: string;
  /** Minutes after local midnight. */
  minute: number;
  /** Tutors free for the whole session. Never sent to the browser. */
  tutorIds: string[];
};

export type SlotQuery = {
  subjectId: string;
  durationMinutes: number;
  now: Date;
  tutors: SlotTutor[];
  availability: AvailabilityWindow[];
  busy: BusyInterval[];
  rules: Pick<
    BookingRules,
    | "earliestStartMinute"
    | "latestEndMinute"
    | "slotStepMinutes"
    | "daysAhead"
    | "minLeadHours"
    | "allowWeekends"
  >;
  tz?: string;
};

export function eligibleTutorIds(tutors: SlotTutor[], subjectId: string): string[] {
  return tutors.filter((t) => t.active && t.subjectIds.includes(subjectId)).map((t) => t.id);
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

export function isTutorBusy(busy: BusyInterval[], tutorId: string, start: Date, end: Date) {
  const s = start.getTime();
  const e = end.getTime();
  return busy.some((b) => b.tutorId === tutorId && overlaps(s, e, b.start.getTime(), b.end.getTime()));
}

export function computeSlots(q: SlotQuery): Slot[] {
  const tz = q.tz ?? TZ;
  const { rules } = q;
  const tutorIds = new Set(eligibleTutorIds(q.tutors, q.subjectId));
  if (tutorIds.size === 0) return [];

  const earliestStart = q.now.getTime() + rules.minLeadHours * 3600_000;
  const durationMs = q.durationMinutes * 60_000;
  const step = rules.slotStepMinutes;
  const today = localDate(q.now, tz);
  const byStart = new Map<string, Slot>();

  for (let i = 0; i < rules.daysAhead; i++) {
    const date = addDays(today, i);
    const weekday = weekdayOf(date);
    if (!rules.allowWeekends && (weekday === 0 || weekday === 6)) continue;

    for (const w of q.availability) {
      if (w.weekday !== weekday || !tutorIds.has(w.tutorId)) continue;
      const from = Math.max(w.startMinute, rules.earliestStartMinute);
      const to = Math.min(w.endMinute, rules.latestEndMinute);
      // Snap to the grid so every tutor's slots line up (3:30, 4:00, ...).
      for (let m = Math.ceil(from / step) * step; m + q.durationMinutes <= to; m += step) {
        const start = zonedToUtc(date, m, tz);
        if (start.getTime() < earliestStart) continue;
        const end = new Date(start.getTime() + durationMs);
        if (isTutorBusy(q.busy, w.tutorId, start, end)) continue;

        const key = start.toISOString();
        const slot = byStart.get(key) ?? { start: key, date, minute: m, tutorIds: [] };
        if (!slot.tutorIds.includes(w.tutorId)) slot.tutorIds.push(w.tutorId);
        byStart.set(key, slot);
      }
    }
  }

  return [...byStart.values()].sort((a, b) => a.start.localeCompare(b.start));
}

/** What the public API returns: times only, never who is free. */
export function publicSlots(slots: Slot[]) {
  return slots.map(({ start, date, minute }) => ({ start, date, minute }));
}
