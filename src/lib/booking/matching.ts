/**
 * Picks one tutor for a request. The student lists preferred times in order;
 * we take the first time someone is free, and among the free tutors choose
 * whoever has the fewest sessions this period, so the 4-way split stays fair.
 */

import type { Slot } from "./slots";

export type Assignment = {
  start: string;
  tutorId: string;
  /** Which of the student's preferences we used (0 = first choice). */
  preferenceIndex: number;
};

/**
 * @param load sessions per tutor in the current period
 * @param order stable tie-break order (tutor ids by sort order)
 */
export function pickTutor(
  candidates: string[],
  load: ReadonlyMap<string, number>,
  order: readonly string[],
): string | null {
  if (candidates.length === 0) return null;
  const rank = (id: string) => {
    const i = order.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...candidates].sort((a, b) => {
    const byLoad = (load.get(a) ?? 0) - (load.get(b) ?? 0);
    return byLoad !== 0 ? byLoad : rank(a) - rank(b);
  })[0];
}

export function assignTutor(params: {
  preferences: string[];
  slots: Slot[];
  load: ReadonlyMap<string, number>;
  order: readonly string[];
  /** (tutorId, start) pairs to skip, e.g. after losing a race for that slot. */
  exclude?: ReadonlySet<string>;
}): Assignment | null {
  const byStart = new Map(params.slots.map((s) => [new Date(s.start).toISOString(), s]));
  for (let i = 0; i < params.preferences.length; i++) {
    const start = new Date(params.preferences[i]).toISOString();
    const slot = byStart.get(start);
    if (!slot) continue;
    const candidates = slot.tutorIds.filter((id) => !params.exclude?.has(exclusionKey(id, start)));
    const tutorId = pickTutor(candidates, params.load, params.order);
    if (tutorId) return { start, tutorId, preferenceIndex: i };
  }
  return null;
}

export function exclusionKey(tutorId: string, start: string) {
  return `${tutorId}@${new Date(start).toISOString()}`;
}
