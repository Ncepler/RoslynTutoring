import { NextResponse } from "next/server";
import { expireStale, sendReminders } from "@/lib/data/bookings";
import { isPreview } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

// Sends every reminder for the day in one run.
export const maxDuration = 300;

/**
 * Runs once a day (vercel.json, around noon New York time; the free plan
 * allows one run per day). Sends reminders for today's sessions and closes
 * stale requests. Stale requests are also closed whenever anyone loads times
 * or a booking page, so they never block a slot.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isPreview) return NextResponse.json({ skipped: "preview mode" });

  const db = createServiceClient();
  const now = new Date();
  const expired = await expireStale(db, now);
  const reminders = await sendReminders(db, now);
  return NextResponse.json({ expired, reminders });
}
