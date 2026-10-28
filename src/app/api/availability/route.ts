import { NextResponse, type NextRequest } from "next/server";
import { sessionLengths } from "@/config/site";
import { getOpenSlots } from "@/lib/data/bookings";

/** Open start times for a subject and length. Never says which tutor is free. */
export async function GET(request: NextRequest) {
  const subjectId = request.nextUrl.searchParams.get("subject") ?? "";
  const duration = Number(request.nextUrl.searchParams.get("duration"));
  if (!subjectId || subjectId.length > 64 || !(sessionLengths as readonly number[]).includes(duration)) {
    return NextResponse.json({ error: "Pick a subject and a length." }, { status: 400 });
  }
  try {
    const slots = await getOpenSlots(subjectId, duration);
    return NextResponse.json({ slots }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[availability]", err);
    return NextResponse.json({ error: "Couldn't load times. Try again in a moment." }, { status: 500 });
  }
}
