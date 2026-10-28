import { getBookingIcs } from "@/lib/data/bookings";

export async function GET(_request: Request, ctx: RouteContext<"/booking/[token]/calendar.ics">) {
  const { token } = await ctx.params;
  const ics = await getBookingIcs(token);
  if (!ics) return new Response("Not found", { status: 404 });
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="session.ics"',
      "cache-control": "private, no-store",
    },
  });
}
