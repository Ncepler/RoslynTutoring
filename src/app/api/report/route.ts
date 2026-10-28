import { NextResponse } from "next/server";
import { fieldErrors, reportSchema } from "@/lib/booking/validation";
import { submitReport } from "@/lib/data/reports";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) }, { status: 422 });
  }
  try {
    await submitReport(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[report]", err);
    return NextResponse.json({ error: "Couldn't send that. Please email us instead." }, { status: 500 });
  }
}
