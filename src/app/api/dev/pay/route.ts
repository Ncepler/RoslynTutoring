import { NextResponse } from "next/server";
import { simulatePayment } from "@/lib/data/bookings";
import { isPreview } from "@/lib/env";
import { stripeConfigured } from "@/lib/payments/stripe";

/** Local testing only: marks a booking paid when Stripe isn't set up yet. */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" || stripeConfigured || isPreview) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const { token } = (await request.json().catch(() => ({}))) as { token?: string };
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  const result = await simulatePayment(token);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
