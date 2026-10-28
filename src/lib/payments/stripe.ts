import "server-only";
import Stripe from "stripe";
import { site } from "@/config/site";

/**
 * Stripe Checkout. We never touch card details: the student (or parent) pays
 * on Stripe's hosted page, and the webhook tells us when it's done.
 */

let client: Stripe | null = null;

export const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

export async function createCheckout(params: {
  bookingId: string;
  publicToken: string;
  amountCents: number;
  description: string;
  customerEmail: string;
  expiresAt: Date;
}): Promise<{ id: string; url: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: params.amountCents,
            product_data: { name: params.description },
          },
        },
      ],
      customer_email: params.customerEmail,
      client_reference_id: params.bookingId,
      metadata: { booking_id: params.bookingId },
      payment_intent_data: { metadata: { booking_id: params.bookingId } },
      expires_at: Math.floor(params.expiresAt.getTime() / 1000),
      success_url: `${site.url}/booking/${params.publicToken}?paid=1`,
      cancel_url: `${site.url}/booking/${params.publicToken}`,
    },
    { idempotencyKey: `checkout-${params.bookingId}` },
  );
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { id: session.id, url: session.url };
}

/** Closes an open checkout so a released slot can't be paid for later. */
export async function expireCheckout(sessionId: string | null): Promise<void> {
  const stripe = getStripe();
  if (!stripe || !sessionId) return;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status === "open") await stripe.checkout.sessions.expire(sessionId);
  } catch (err) {
    console.error("[stripe] couldn't expire checkout", err);
  }
}

export async function refund(paymentIntentId: string | null, amountCents: number, bookingId: string): Promise<boolean> {
  const stripe = getStripe();
  if (!stripe || !paymentIntentId || amountCents <= 0) return false;
  await stripe.refunds.create(
    { payment_intent: paymentIntentId, amount: amountCents, metadata: { booking_id: bookingId } },
    { idempotencyKey: `refund-${bookingId}-${amountCents}` },
  );
  return true;
}

/** Amount, payment intent and Stripe's fee for a completed checkout. */
export async function paymentDetails(sessionId: string): Promise<{
  amountCents: number;
  paymentIntentId: string | null;
  feeCents: number;
}> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent.latest_charge.balance_transaction"],
  });
  const intent = typeof session.payment_intent === "object" ? session.payment_intent : null;
  const charge = intent && typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  const balance = charge && typeof charge.balance_transaction === "object" ? charge.balance_transaction : null;
  return {
    amountCents: session.amount_total ?? 0,
    paymentIntentId: intent?.id ?? (typeof session.payment_intent === "string" ? session.payment_intent : null),
    feeCents: balance?.fee ?? 0,
  };
}

export function verifyWebhook(payload: string, signature: string | null): Stripe.Event {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret || !signature) throw new Error("Stripe webhook is not configured");
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
