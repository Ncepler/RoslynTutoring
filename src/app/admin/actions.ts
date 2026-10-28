"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { bookingRules } from "@/config/site";
import { requireAdmin } from "@/lib/data/admin";
import { cancelBooking, claimBooking, closeRequest, type ActionResult } from "@/lib/data/bookings";
import { CATALOG_TAG } from "@/lib/data/catalog";
import { isPreview } from "@/lib/env";
import { createUserClient } from "@/lib/supabase/server";

const PREVIEW: ActionResult = { ok: false, message: "Preview mode: connect Supabase to save changes." };

async function session() {
  const s = await requireAdmin();
  return s.preview ? null : s;
}

function failed(err: unknown): ActionResult {
  console.error("[admin action]", err);
  return { ok: false, message: "Something went wrong. Try again, or check the Supabase logs." };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function signIn(_prev: { error?: string } | undefined, form: FormData): Promise<{ error?: string }> {
  if (isPreview) redirect("/admin");
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const db = await createUserClient();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email and password don't match a founder account." };
  redirect("/admin");
}

export async function signOut() {
  if (!isPreview) {
    const db = await createUserClient();
    await db.auth.signOut();
  }
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

/** Claim an open request at one of the student's preferred times. */
export async function claimAction(bookingId: string, start: string): Promise<ActionResult> {
  const s = await session();
  if (!s) return PREVIEW;
  try {
    const result = await claimBooking(s.db, bookingId, s.tutor.id, start);
    refresh();
    return result;
  } catch (err) {
    return failed(err);
  }
}

/** Close an open request nobody can take; the student is told. */
export async function closeAction(bookingId: string): Promise<ActionResult> {
  const s = await session();
  if (!s) return PREVIEW;
  try {
    const result = await closeRequest(s.db, bookingId, s.tutor.id);
    refresh();
    return result;
  } catch (err) {
    return failed(err);
  }
}

const cancelSchema = z.object({
  bookingId: z.string().min(1).max(64),
  refund: z.enum(["policy", "full", "none"]),
  reason: z.string().max(500).optional(),
});

export async function cancelAction(input: z.input<typeof cancelSchema>): Promise<ActionResult> {
  const s = await session();
  if (!s) return PREVIEW;
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  try {
    const result = await cancelBooking(s.db, parsed.data.bookingId, {
      by: "admin",
      refund: parsed.data.refund,
      reason: parsed.data.reason,
    });
    refresh();
    return result;
  } catch (err) {
    return failed(err);
  }
}

// ---------------------------------------------------------------------------
// Availability and profile (each founder edits only their own; RLS enforces it)
// ---------------------------------------------------------------------------

const windowSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(1440),
    endMinute: z.number().int().min(0).max(1440),
  })
  .refine((w) => w.endMinute > w.startMinute, { message: "Each window must end after it starts." });

export async function saveAvailability(windows: z.input<typeof windowSchema>[]): Promise<ActionResult> {
  const s = await session();
  if (!s) return PREVIEW;
  const parsed = z.array(windowSchema).max(50).safeParse(windows);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid hours." };

  const clipped = parsed.data
    .map((w) => ({
      ...w,
      startMinute: Math.max(w.startMinute, bookingRules.earliestStartMinute),
      endMinute: Math.min(w.endMinute, bookingRules.latestEndMinute),
    }))
    .filter((w) => w.endMinute > w.startMinute);

  try {
    const del = await s.db.from("availability").delete().eq("tutor_id", s.tutor.id);
    if (del.error) throw del.error;
    if (clipped.length > 0) {
      const ins = await s.db.from("availability").insert(
        clipped.map((w) => ({
          tutor_id: s.tutor.id,
          weekday: w.weekday,
          start_minute: w.startMinute,
          end_minute: w.endMinute,
        })),
      );
      if (ins.error) throw ins.error;
    }
    refresh();
    return { ok: true, message: "Hours saved. Students see the new times right away." };
  } catch (err) {
    return failed(err);
  }
}

const profileSchema = z.object({
  zoomLink: z.union([z.url({ protocol: /^https$/, error: "Use the full https:// Zoom link" }), z.literal("")]),
  calendarId: z.string().trim().max(200),
});

export async function saveProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const s = await session();
  if (!s) return PREVIEW;
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid profile." };
  try {
    const { error } = await s.db
      .from("tutor_private")
      .update({ zoom_link: parsed.data.zoomLink || null, calendar_id: parsed.data.calendarId || null })
      .eq("tutor_id", s.tutor.id);
    if (error) throw error;
    refresh();
    return { ok: true, message: "Profile saved." };
  } catch (err) {
    return failed(err);
  }
}

// ---------------------------------------------------------------------------
// Subjects and who teaches what
// ---------------------------------------------------------------------------

const subjectSchema = z.object({
  id: z.string().max(64).optional(),
  name: z.string().trim().min(1, "Give the subject a name").max(80),
  hasHonors: z.boolean(),
  active: z.boolean(),
});

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function saveSubject(input: z.input<typeof subjectSchema>): Promise<ActionResult> {
  const s = await session();
  if (!s) return PREVIEW;
  const parsed = subjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid subject." };
  const { id, name, hasHonors, active } = parsed.data;
  try {
    if (id) {
      const { error } = await s.db.from("subjects").update({ name, has_honors: hasHonors, active }).eq("id", id);
      if (error) throw error;
    } else {
      const { data: last } = await s.db.from("subjects").select("sort_order").order("sort_order", { ascending: false }).limit(1);
      const { error } = await s.db.from("subjects").insert({
        name,
        slug: slugify(name),
        has_honors: hasHonors,
        active,
        sort_order: (last?.[0]?.sort_order ?? 0) + 10,
      });
      if (error?.code === "23505") return { ok: false, message: "A subject with that name already exists." };
      if (error) throw error;
    }
    updateTag(CATALOG_TAG);
    refresh();
    return { ok: true, message: id ? "Subject updated." : "Subject added." };
  } catch (err) {
    return failed(err);
  }
}

export async function setTeaches(tutorId: string, subjectId: string, teaches: boolean): Promise<ActionResult> {
  const s = await session();
  if (!s) return PREVIEW;
  try {
    const { error } = teaches
      ? await s.db.from("tutor_subjects").upsert({ tutor_id: tutorId, subject_id: subjectId })
      : await s.db.from("tutor_subjects").delete().eq("tutor_id", tutorId).eq("subject_id", subjectId);
    if (error) throw error;
    updateTag(CATALOG_TAG);
    refresh();
    return { ok: true };
  } catch (err) {
    return failed(err);
  }
}

// ---------------------------------------------------------------------------
// Test schedule (shown on the homepage)
// ---------------------------------------------------------------------------

const testSchema = z.object({
  subjectId: z.string().min(1).max(64),
  course: z.string().trim().min(1, "Name the test, like \"Geometry Regents\" or \"Unit 4 test\"").max(120),
  level: z.enum(["regular", "honors", "both"]),
  testDate: z.iso.date("Pick a date"),
});

export async function createTest(input: z.input<typeof testSchema>): Promise<ActionResult> {
  const s = await session();
  if (!s) return PREVIEW;
  const parsed = testSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid test." };
  try {
    const { error } = await s.db.from("tests").insert({
      subject_id: parsed.data.subjectId,
      course: parsed.data.course,
      level: parsed.data.level === "both" ? null : parsed.data.level,
      test_date: parsed.data.testDate,
      created_by: s.tutor.id,
    });
    if (error) throw error;
    updateTag(CATALOG_TAG);
    refresh();
    return { ok: true, message: "Test added. It's on the homepage now." };
  } catch (err) {
    return failed(err);
  }
}

export async function deleteTest(testId: string): Promise<ActionResult> {
  const s = await session();
  if (!s) return PREVIEW;
  try {
    const { error } = await s.db.from("tests").delete().eq("id", testId);
    if (error) throw error;
    updateTag(CATALOG_TAG);
    refresh();
    return { ok: true, message: "Test removed." };
  } catch (err) {
    return failed(err);
  }
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function setReportResolved(reportId: string, resolved: boolean): Promise<ActionResult> {
  const s = await session();
  if (!s) return PREVIEW;
  try {
    const { error } = await s.db
      .from("reports")
      .update({ resolved_at: resolved ? new Date().toISOString() : null, resolved_by: resolved ? s.tutor.id : null })
      .eq("id", reportId);
    if (error) throw error;
    refresh();
    return { ok: true, message: resolved ? "Marked resolved." : "Reopened." };
  } catch (err) {
    return failed(err);
  }
}
