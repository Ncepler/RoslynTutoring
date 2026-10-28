/**
 * Booking rules that depend on the clock: claiming, holds, cancelling, and
 * lazily expiring stale requests. Pure functions; pass `now`.
 */

import { bookingRules, pricing, type BookingRules } from "@/config/site";
import type { Booking, BookingStatus } from "@/lib/types";

const HOUR = 3600_000;
const MINUTE = 60_000;

export function priceCents(durationMinutes: number): number {
  const price = pricing[durationMinutes as keyof typeof pricing];
  if (price === undefined) throw new Error(`No price for ${durationMinutes} minutes`);
  return price;
}

export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

/**
 * The slot is held for payment for `holdHours` after it's claimed, but never
 * past an hour before the session, so an unpaid slot doesn't sit idle.
 */
export function holdExpiresAt(
  acceptedAt: Date,
  startAt: Date,
  rules: Pick<BookingRules, "holdHours" | "holdEndsBeforeStartMinutes"> = bookingRules,
): Date {
  const byHold = acceptedAt.getTime() + rules.holdHours * HOUR;
  const byStart = startAt.getTime() - rules.holdEndsBeforeStartMinutes * MINUTE;
  return new Date(Math.min(byHold, byStart));
}

/** Students need at least this long to pay after a tutor claims a request. */
export const MIN_PAYMENT_WINDOW_MINUTES = 30;

export type Check = { ok: true } | { ok: false; reason: string };

/**
 * The earliest a session can start and still be claimed: the tutor claims,
 * the student gets at least MIN_PAYMENT_WINDOW_MINUTES to pay, and the hold
 * ends `holdEndsBeforeStartMinutes` before the session.
 */
export function claimCutoff(
  now: Date,
  rules: Pick<BookingRules, "holdEndsBeforeStartMinutes"> = bookingRules,
): Date {
  return new Date(now.getTime() + (rules.holdEndsBeforeStartMinutes + MIN_PAYMENT_WINDOW_MINUTES) * MINUTE);
}

/** An open request expires once even its latest preferred time can't be claimed in time. */
export function claimDeadline(
  requestedStarts: string[],
  rules: Pick<BookingRules, "holdEndsBeforeStartMinutes"> = bookingRules,
): Date {
  const latest = Math.max(...requestedStarts.map((s) => new Date(s).getTime()));
  return new Date(latest - (rules.holdEndsBeforeStartMinutes + MIN_PAYMENT_WINDOW_MINUTES) * MINUTE);
}

/** Whether a founder can claim this request at `start`, one of the student's times. */
export function canClaim(
  b: Pick<Booking, "status" | "tutorId" | "requestedStarts">,
  start: string,
  now: Date,
  rules: Pick<BookingRules, "holdEndsBeforeStartMinutes"> = bookingRules,
): Check {
  if (b.status !== "pending") return { ok: false, reason: "This request is no longer open." };
  if (b.tutorId) return { ok: false, reason: "Someone already claimed this request." };
  const t = new Date(start).getTime();
  if (Number.isNaN(t) || !b.requestedStarts.some((s) => new Date(s).getTime() === t)) {
    return { ok: false, reason: "That isn't one of the student's times." };
  }
  if (t < claimCutoff(now, rules).getTime()) {
    return { ok: false, reason: "That time is too soon to leave the student time to pay." };
  }
  return { ok: true };
}

/** Admins can close an open request when nobody can take it. */
export function canClose(b: Pick<Booking, "status" | "tutorId">): Check {
  return b.status === "pending" && !b.tutorId
    ? { ok: true }
    : { ok: false, reason: "This request is no longer open." };
}

/**
 * Stripe Checkout sessions must expire between 30 minutes and 24 hours from
 * creation. Clamp our hold into that range.
 */
export function checkoutExpiresAt(hold: Date, now: Date): Date {
  const min = now.getTime() + 31 * MINUTE;
  const max = now.getTime() + 24 * HOUR - MINUTE;
  return new Date(Math.min(Math.max(hold.getTime(), min), max));
}

export type CancelQuote =
  | { allowed: false; reason: string }
  | { allowed: true; refundCents: number; late: boolean };

/**
 * What happens if the student cancels now. Free up to `freeCancelHours`
 * before the session; later cancels are allowed but not refunded. Admins can
 * override and refund anyway from the dashboard.
 */
export function cancelQuote(
  b: Pick<Booking, "status" | "startAt" | "amountPaidCents" | "refundedCents">,
  now: Date,
  rules: Pick<BookingRules, "freeCancelHours"> = bookingRules,
): CancelQuote {
  if (b.status === "pending" || b.status === "awaiting_payment") {
    return { allowed: true, refundCents: 0, late: false };
  }
  if (b.status !== "confirmed") {
    return { allowed: false, reason: "This booking is no longer active." };
  }
  const start = b.startAt ? new Date(b.startAt).getTime() : 0;
  if (now.getTime() >= start) {
    return { allowed: false, reason: "This session has already started." };
  }
  const refundable = Math.max(0, b.amountPaidCents - b.refundedCents);
  const late = start - now.getTime() < rules.freeCancelHours * HOUR;
  return { allowed: true, refundCents: late ? 0 : refundable, late };
}

/**
 * The status a booking really has right now, even if the cleanup job hasn't
 * run yet: an open request past its claim deadline, or an unpaid hold that
 * ran out, is expired.
 */
export function effectiveStatus(
  b: Pick<Booking, "status" | "claimDeadline" | "holdExpiresAt">,
  now: Date,
): BookingStatus {
  if (b.status === "pending" && b.claimDeadline && new Date(b.claimDeadline).getTime() <= now.getTime()) {
    return "expired";
  }
  if (b.status === "awaiting_payment" && b.holdExpiresAt && new Date(b.holdExpiresAt).getTime() <= now.getTime()) {
    return "expired";
  }
  return b.status;
}

export function isPast(b: Pick<Booking, "endAt">, now: Date) {
  return b.endAt !== null && new Date(b.endAt).getTime() <= now.getTime();
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Waiting for a tutor to claim it",
  awaiting_payment: "Claimed, awaiting payment",
  confirmed: "Confirmed",
  declined: "Closed",
  expired: "Expired",
  cancelled: "Cancelled",
};
