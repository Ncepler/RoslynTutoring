import { describe, expect, it } from "vitest";
import {
  canAccept,
  canDecline,
  cancelQuote,
  checkoutExpiresAt,
  effectiveStatus,
  formatPrice,
  holdExpiresAt,
  priceCents,
} from "./policy";

const H = 3600_000;
const now = new Date("2026-11-02T14:00:00Z");
const inHours = (h: number) => new Date(now.getTime() + h * H).toISOString();

describe("pricing", () => {
  it("charges $40 for 30 minutes and $60 for an hour", () => {
    expect(priceCents(30)).toBe(4000);
    expect(priceCents(60)).toBe(6000);
  });

  it("rejects lengths we don't sell", () => {
    expect(() => priceCents(45)).toThrow();
  });

  it("formats whole and fractional dollars", () => {
    expect(formatPrice(4000)).toBe("$40");
    expect(formatPrice(4050)).toBe("$40.50");
  });
});

describe("holdExpiresAt", () => {
  it("holds the slot for 24 hours after acceptance", () => {
    expect(holdExpiresAt(now, new Date(inHours(72))).toISOString()).toBe(inHours(24));
  });

  it("ends the hold an hour before a session that is sooner than that", () => {
    expect(holdExpiresAt(now, new Date(inHours(10))).toISOString()).toBe(inHours(9));
  });
});

describe("canAccept / canDecline", () => {
  it("accepts a pending request with time to pay", () => {
    expect(canAccept({ status: "pending", startAt: inHours(10) }, now)).toEqual({ ok: true });
  });

  it("refuses when the session is too close to leave time to pay", () => {
    expect(canAccept({ status: "pending", startAt: inHours(1.25) }, now).ok).toBe(false);
  });

  it("refuses anything that isn't pending", () => {
    expect(canAccept({ status: "confirmed", startAt: inHours(10) }, now).ok).toBe(false);
    expect(canDecline({ status: "declined" }).ok).toBe(false);
    expect(canDecline({ status: "pending" }).ok).toBe(true);
  });
});

describe("checkoutExpiresAt", () => {
  it("keeps holds inside Stripe's 30 minute to 24 hour window", () => {
    expect(checkoutExpiresAt(new Date(inHours(30)), now).getTime()).toBeLessThan(now.getTime() + 24 * H);
    expect(checkoutExpiresAt(new Date(inHours(0.1)), now).getTime()).toBeGreaterThanOrEqual(
      now.getTime() + 30 * 60_000,
    );
    expect(checkoutExpiresAt(new Date(inHours(5)), now).toISOString()).toBe(inHours(5));
  });
});

describe("cancelQuote", () => {
  const paid = { status: "confirmed" as const, amountPaidCents: 6000, refundedCents: 0 };

  it("refunds in full up to 12 hours before", () => {
    expect(cancelQuote({ ...paid, startAt: inHours(12) }, now)).toEqual({
      allowed: true,
      refundCents: 6000,
      late: false,
    });
  });

  it("allows late cancels but doesn't refund them", () => {
    expect(cancelQuote({ ...paid, startAt: inHours(11.9) }, now)).toEqual({
      allowed: true,
      refundCents: 0,
      late: true,
    });
  });

  it("doesn't refund money that was already refunded", () => {
    expect(cancelQuote({ ...paid, refundedCents: 2000, startAt: inHours(48) }, now)).toMatchObject({
      refundCents: 4000,
    });
  });

  it("lets unpaid requests be cancelled any time before they happen", () => {
    expect(cancelQuote({ status: "pending", amountPaidCents: 0, refundedCents: 0, startAt: inHours(1) }, now)).toEqual({
      allowed: true,
      refundCents: 0,
      late: false,
    });
  });

  it("refuses once the session has started or the booking is over", () => {
    expect(cancelQuote({ ...paid, startAt: inHours(-0.1) }, now).allowed).toBe(false);
    expect(cancelQuote({ ...paid, status: "cancelled", startAt: inHours(48) }, now).allowed).toBe(false);
  });
});

describe("effectiveStatus", () => {
  it("expires an unanswered request once there's no time left to accept and pay", () => {
    expect(effectiveStatus({ status: "pending", startAt: inHours(1.4), holdExpiresAt: null }, now)).toBe("expired");
    expect(effectiveStatus({ status: "pending", startAt: inHours(2), holdExpiresAt: null }, now)).toBe("pending");
  });

  it("expires an unpaid hold after it runs out", () => {
    expect(
      effectiveStatus({ status: "awaiting_payment", startAt: inHours(30), holdExpiresAt: inHours(-0.01) }, now),
    ).toBe("expired");
    expect(
      effectiveStatus({ status: "awaiting_payment", startAt: inHours(30), holdExpiresAt: inHours(1) }, now),
    ).toBe("awaiting_payment");
  });

  it("leaves confirmed bookings alone", () => {
    expect(effectiveStatus({ status: "confirmed", startAt: inHours(-5), holdExpiresAt: null }, now)).toBe("confirmed");
  });
});
