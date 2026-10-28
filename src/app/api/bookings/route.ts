import { NextResponse } from "next/server";
import { bookingRequestSchema, fieldErrors } from "@/lib/booking/validation";
import { createBookingRequest } from "@/lib/data/bookings";

/**
 * The only way the public creates anything: a booking request. Validated
 * here, then written with the service role (students can't write to the
 * database directly; RLS has no public insert policies).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) }, { status: 422 });
  }

  try {
    const result = await createBookingRequest(parsed.data);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
    return NextResponse.json({ token: result.token, startAt: result.startAt, preferenceIndex: result.preferenceIndex });
  } catch (err) {
    console.error("[bookings] create failed", err);
    return NextResponse.json({ error: "Something went wrong on our end. Please try again." }, { status: 500 });
  }
}
