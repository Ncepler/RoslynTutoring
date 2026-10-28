import { NextResponse } from "next/server";
import { cancelByToken } from "@/lib/data/bookings";

export async function POST(_request: Request, ctx: RouteContext<"/api/bookings/[token]/cancel">) {
  const { token } = await ctx.params;
  try {
    const result = await cancelByToken(token);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    console.error("[bookings] cancel failed", err);
    return NextResponse.json({ ok: false, message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
