/**
 * Booking rules that depend on the clock: holds, accepting, cancelling,
 * and lazily expiring stale requests. Pure functions; pass `now`.
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
 * The slot is held for payment for `holdHours` after acceptance, but never
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

/** Students need at least this long to pay after a tutor accepts. */
export const MIN_PAYMENT_WINDOW_MINUTES = 30;

export type Check = { ok: true } | { ok: false; reason: string };

export function canAccept(
  b: Pick<Booking, "status" | "startAt">,
  now: Date,
  rules: Pick<BookingRules, "holdHours" | "holdEndsBeforeStartMinutes"> = bookingRules,
): Check {
  if (b.status !== "pending") return { ok: false, reason: "This request isn't waiting for a response." };
  const hold = holdExpiresAt(now, new Date(b.startAt), rules);
  if (hold.getTime() - now.getTime() < MIN_PAYMENT_WINDOW_MINUTES * MINUTE) {
    return { ok: false, reason: "The session starts too soon to leave time for payment." };
  }
  return { ok: true };
}

export function canDecline(b: Pick<Booking, "status">): Check {
  return b.status === "pending"
    ? { ok: true }
    : { ok: false, reason: "This request isn't waiting for a response." };
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
  const start = new Date(b.startAt).getTime();
  if (now.getTime() >= start) {
    return { allowed: false, reason: "This session has already started." };
  }
  const refundable = Math.max(0, b.amountPaidCents - b.refundedCents);
  const late = start - now.getTime() < rules.freeCancelHours * HOUR;
  return { allowed: true, refundCents: late ? 0 : refundable, late };
}

/**
 * A pending request can no longer be accepted once its session starts before
 * this instant (there would be no time left to pay).
 */
export function pendingCutoff(
  now: Date,
  rules: Pick<BookingRules, "holdEndsBeforeStartMinutes"> = bookingRules,
): Date {
  return new Date(now.getTime() + (rules.holdEndsBeforeStartMinutes + MIN_PAYMENT_WINDOW_MINUTES) * MINUTE);
}

/**
 * The status a booking really has right now, even if the cleanup job hasn't
 * run yet: an unanswered request whose time has come, or an unpaid hold that
 * ran out, is expired.
 */
export function effectiveStatus(
  b: Pick<Booking, "status" | "startAt" | "holdExpiresAt">,
  now: Date,
  rules: Pick<BookingRules, "holdEndsBeforeStartMinutes"> = bookingRules,
): BookingStatus {
  if (b.status === "pending" && new Date(b.startAt).getTime() <= pendingCutoff(now, rules).getTime()) {
    return "expired";
  }
  if (b.status === "awaiting_payment" && b.holdExpiresAt && new Date(b.holdExpiresAt).getTime() <= now.getTime()) {
    return "expired";
  }
  return b.status;
}

export function isPast(b: Pick<Booking, "endAt">, now: Date) {
  return new Date(b.endAt).getTime() <= now.getTime();
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Waiting for a tutor",
  awaiting_payment: "Accepted, awaiting payment",
  confirmed: "Confirmed",
  declined: "Declined",
  expired: "Expired",
  cancelled: "Cancelled",
};
