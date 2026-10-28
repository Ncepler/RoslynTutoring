import { NextResponse } from "next/server";
import { checkoutExpired, confirmPayment, syncRefund } from "@/lib/data/bookings";
import { verifyWebhook } from "@/lib/payments/stripe";
import { createServiceClient } from "@/lib/supabase/service";

// Confirming a payment also creates the calendar event and sends emails.
export const maxDuration = 60;

/**
 * Stripe → us. Subscribe the endpoint to: checkout.session.completed,
 * checkout.session.async_payment_succeeded, checkout.session.expired and
 * charge.refunded.
 */
export async function POST(request: Request) {
  const payload = await request.text();
  let event;
  try {
    event = verifyWebhook(payload, request.headers.get("stripe-signature"));
  } catch (err) {
    console.error("[stripe] bad webhook", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = createServiceClient();
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        if (session.payment_status === "paid") {
          await confirmPayment(db, session.id, session.metadata?.booking_id ?? null);
        }
        break;
      }
      case "checkout.session.expired":
        await checkoutExpired(db, event.data.object.id);
        break;
      case "charge.refunded": {
        const charge = event.data.object;
        const intent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (intent) await syncRefund(db, intent, charge.amount_refunded);
        break;
      }
    }
  } catch (err) {
    console.error(`[stripe] handling ${event.type} failed`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 }); // Stripe retries
  }
  return NextResponse.json({ received: true });
}
