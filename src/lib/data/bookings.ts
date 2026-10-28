import "server-only";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bookingRules, site } from "@/config/site";
import { busyFromBookings, freeTutorsByTime } from "@/lib/booking/claim";
import {
  cancelQuote,
  canClaim,
  canClose,
  checkoutExpiresAt,
  claimDeadline,
  effectiveStatus,
  holdExpiresAt,
  priceCents,
} from "@/lib/booking/policy";
import { computeSlots, publicSlots, type BusyInterval } from "@/lib/booking/slots";
import type { BookingRequest } from "@/lib/booking/validation";
import { buildIcs } from "@/lib/calendar/ics";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/calendar/google";
import { sendEmail } from "@/lib/email/send";
import * as templates from "@/lib/email/templates";
import { asClaimed, type BookingContext, type ClaimedContext } from "@/lib/email/templates";
import { isPreview } from "@/lib/env";
import { notifyAdmins } from "@/lib/notify";
import { createCheckout, expireCheckout, paymentDetails, refund } from "@/lib/payments/stripe";
import {
  previewAvailability,
  previewBookings,
  previewStudents,
  previewSubjects,
  previewTutorPrivate,
  previewTutors,
} from "@/lib/preview/data";
import { createServiceClient } from "@/lib/supabase/service";
import { HOLDING_STATUSES, type AvailabilityWindow, type Booking, type Tutor } from "@/lib/types";
import {
  TUTOR_SELECT,
  toAvailability,
  toBooking,
  toStudent,
  toSubject,
  toTest,
  toTutor,
  toTutorPrivate,
  type AvailabilityRow,
  type BookingRow,
  type StudentRow,
  type SubjectRow,
  type TestRow,
  type TutorPrivateRow,
  type TutorRow,
} from "./rows";

type Db = SupabaseClient;

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Scheduling inputs
// ---------------------------------------------------------------------------

type Scheduling = {
  tutors: Tutor[];
  availability: AvailabilityWindow[];
  /** Time already taken by claimed bookings. Open requests don't block anyone. */
  busy: BusyInterval[];
};

async function loadScheduling(db: Db, now: Date): Promise<Scheduling> {
  const [tutors, availability, bookings] = await Promise.all([
    db.from("tutors").select(TUTOR_SELECT).eq("active", true).order("sort_order"),
    db.from("availability").select("id, tutor_id, weekday, start_minute, end_minute"),
    db
      .from("bookings")
      .select("tutor_id, start_at, end_at")
      .in("status", HOLDING_STATUSES as string[])
      .not("tutor_id", "is", null)
      .gte("end_at", now.toISOString()),
  ]);
  for (const r of [tutors, availability, bookings]) if (r.error) throw r.error;

  const rows = bookings.data as { tutor_id: string; start_at: string; end_at: string }[];
  return {
    tutors: (tutors.data as TutorRow[]).map(toTutor),
    availability: (availability.data as AvailabilityRow[]).map(toAvailability),
    busy: rows.map((b) => ({ tutorId: b.tutor_id, start: new Date(b.start_at), end: new Date(b.end_at) })),
  };
}

function previewScheduling(now: Date): Scheduling {
  return { tutors: previewTutors, availability: previewAvailability, busy: busyFromBookings(previewBookings(now), now) };
}

/**
 * Times a student can pick for a subject: when at least one founder who
 * teaches it is free. Times only; who is free is never exposed.
 */
export async function getOpenSlots(subjectId: string, durationMinutes: number, now = new Date()) {
  let scheduling: Scheduling;
  if (isPreview) {
    scheduling = previewScheduling(now);
  } else {
    const db = createServiceClient();
    await expireStale(db, now);
    scheduling = await loadScheduling(db, now);
  }
  return publicSlots(computeSlots({ subjectId, durationMinutes, now, rules: bookingRules, ...scheduling }));
}

// ---------------------------------------------------------------------------
// Context for emails and actions
// ---------------------------------------------------------------------------

const CONTEXT_SELECT =
  "*, students(*), subjects(*), tutors!bookings_tutor_id_fkey(id, first_name, last_name, grade, active, sort_order), tests(id, subject_id, course, level, test_date)";

type ContextRow = BookingRow & {
  students: StudentRow;
  subjects: SubjectRow;
  tutors: TutorRow | null;
  tests: TestRow | null;
};

async function contextFromRow(db: Db, row: ContextRow): Promise<BookingContext> {
  let tutorPrivate = null;
  if (row.tutor_id) {
    const { data } = await db
      .from("tutor_private")
      .select("tutor_id, email, zoom_link, calendar_id")
      .eq("tutor_id", row.tutor_id)
      .maybeSingle();
    tutorPrivate = data ? toTutorPrivate(data as TutorPrivateRow) : null;
  }
  return {
    booking: toBooking(row),
    student: toStudent(row.students),
    subject: toSubject(row.subjects),
    tutor: row.tutors ? toTutor(row.tutors) : null,
    tutorPrivate,
    test: row.tests ? toTest(row.tests) : null,
  };
}

async function loadContext(db: Db, bookingId: string): Promise<BookingContext | null> {
  const { data, error } = await db.from("bookings").select(CONTEXT_SELECT).eq("id", bookingId).maybeSingle();
  if (error) throw error;
  return data ? contextFromRow(db, data as ContextRow) : null;
}

async function emailFamily(ctx: BookingContext, email: templates.RenderedEmail, attachIcs = false) {
  const claimed = asClaimed(ctx);
  await sendEmail({
    to: ctx.student.email,
    cc: ctx.student.parentEmail,
    ...email,
    attachments: attachIcs && claimed ? [icsAttachment(claimed)] : undefined,
  });
}

function icsAttachment(ctx: ClaimedContext, status: "CONFIRMED" | "CANCELLED" = "CONFIRMED") {
  const zoom = ctx.tutorPrivate?.zoomLink ?? undefined;
  return {
    filename: "session.ics",
    contentType: "text/calendar; charset=utf-8",
    content: buildIcs(
      {
        uid: `${ctx.booking.id}@${new URL(site.url).hostname}`,
        start: new Date(ctx.booking.startAt),
        end: new Date(ctx.booking.endAt),
        summary: `${ctx.subject.name} review with ${ctx.tutor.firstName} (${site.name})`,
        description: [
          `${ctx.subject.name} session with ${ctx.tutor.firstName} ${ctx.tutor.lastName}.`,
          zoom ? `Zoom: ${zoom}` : "Your tutor will send the Zoom link.",
          `Manage: ${templates.bookingUrl(ctx.booking)}`,
        ].join("\n"),
        location: zoom,
        url: templates.bookingUrl(ctx.booking),
        status,
        sequence: status === "CANCELLED" ? 1 : 0,
      },
      site.name,
    ),
  };
}

// ---------------------------------------------------------------------------
// 1. A student sends a request. Nobody is assigned: every founder is told.
// ---------------------------------------------------------------------------

export type CreateResult =
  | { ok: true; token: string; requestedStarts: string[] }
  | { ok: false; status: number; message: string };

const NO_SLOT = "Those times were just taken. Please pick another time.";

/** Keeps the student's preferences that are still open, in their order. */
function stillOpen(preferences: string[], slots: { start: string }[]) {
  const open = new Set(slots.map((s) => new Date(s.start).toISOString()));
  return preferences.map((p) => new Date(p).toISOString()).filter((p) => open.has(p));
}

export async function createBookingRequest(req: BookingRequest, now = new Date()): Promise<CreateResult> {
  if (isPreview) {
    if (!previewSubjects.some((s) => s.id === req.subjectId)) {
      return { ok: false, status: 400, message: "That subject isn't offered." };
    }
    const slots = computeSlots({
      subjectId: req.subjectId,
      durationMinutes: req.durationMinutes,
      now,
      rules: bookingRules,
      ...previewScheduling(now),
    });
    const open = stillOpen(req.preferences, slots);
    if (open.length === 0) return { ok: false, status: 409, message: NO_SLOT };
    return { ok: true, token: "preview", requestedStarts: open };
  }

  const db = createServiceClient();
  await expireStale(db, now);

  const { data: subject, error: subjectError } = await db
    .from("subjects")
    .select("id, has_honors, active")
    .eq("id", req.subjectId)
    .maybeSingle();
  if (subjectError) throw subjectError;
  if (!subject || !subject.active) return { ok: false, status: 400, message: "That subject isn't offered." };
  const level = req.level === "honors" && subject.has_honors ? "honors" : "regular";

  let testId: string | null = null;
  if (req.testId) {
    const { data: test } = await db.from("tests").select("id").eq("id", req.testId).maybeSingle();
    testId = test?.id ?? null;
  }

  const scheduling = await loadScheduling(db, now);
  const slots = computeSlots({
    subjectId: req.subjectId,
    durationMinutes: req.durationMinutes,
    now,
    rules: bookingRules,
    ...scheduling,
  });
  const requestedStarts = stillOpen(req.preferences, slots);
  if (requestedStarts.length === 0) return { ok: false, status: 409, message: NO_SLOT };

  const { data: student, error: studentError } = await db
    .from("students")
    .upsert(
      {
        first_name: req.student.firstName,
        last_name: req.student.lastName,
        grade: req.student.grade,
        email: req.student.email,
        parent_name: req.parent.name,
        parent_email: req.parent.email,
      },
      { onConflict: "email" },
    )
    .select("id")
    .single();
  if (studentError) throw studentError;

  const token = randomBytes(24).toString("base64url");
  const { data, error } = await db
    .from("bookings")
    .insert({
      public_token: token,
      student_id: student.id,
      subject_id: req.subjectId,
      level,
      test_id: testId,
      duration_minutes: req.durationMinutes,
      requested_starts: requestedStarts,
      claim_deadline: claimDeadline(requestedStarts).toISOString(),
      status: "pending",
      price_cents: priceCents(req.durationMinutes),
      consent_at: now.toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;

  const ctx = await loadContext(db, data.id);
  if (ctx) {
    const names = new Map(scheduling.tutors.map((t) => [t.id, t.firstName]));
    const free = freeTutorsByTime(requestedStarts, slots);
    await emailFamily(ctx, templates.requestReceived(ctx));
    await notifyAdmins(
      templates.adminNewRequest(
        ctx,
        requestedStarts.map((s) => ({ start: s, free: (free.get(s) ?? []).map((id) => names.get(id) ?? "") })),
      ),
    );
  }
  return { ok: true, token, requestedStarts };
}

// ---------------------------------------------------------------------------
// 2. A founder claims it (or the founders close it if nobody can take it)
// ---------------------------------------------------------------------------

export async function claimBooking(
  db: Db,
  bookingId: string,
  actorId: string,
  start: string,
  now = new Date(),
): Promise<ActionResult> {
  const ctx = await loadContext(db, bookingId);
  if (!ctx) return { ok: false, message: "Request not found." };
  const check = canClaim(ctx.booking, start, now);
  if (!check.ok) return { ok: false, message: check.reason };

  const startAt = new Date(start);
  const endAt = new Date(startAt.getTime() + ctx.booking.durationMinutes * 60_000);
  const hold = holdExpiresAt(now, startAt);

  // Claim atomically: only one founder can win, and the database refuses it if
  // the claimer already has a session at that time.
  const { data: claimed, error } = await db
    .from("bookings")
    .update({
      tutor_id: actorId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: "awaiting_payment",
      accepted_at: now.toISOString(),
      responded_by: actorId,
      hold_expires_at: hold.toISOString(),
    })
    .eq("id", bookingId)
    .eq("status", "pending")
    .is("tutor_id", null)
    .select("id");
  if (error?.code === "23P01") return { ok: false, message: "You already have a session at that time." };
  if (error) throw error;
  if (!claimed?.length) return { ok: false, message: "Someone claimed this a moment ago." };

  const after = await loadContext(db, bookingId);
  const claimedCtx = after ? asClaimed(after) : null;
  if (!claimedCtx) return { ok: false, message: "Claimed, but couldn't load the booking. Refresh." };

  try {
    const checkout = await createCheckout({
      bookingId,
      publicToken: claimedCtx.booking.publicToken,
      amountCents: claimedCtx.booking.priceCents,
      description: `${claimedCtx.subject.name} session, ${claimedCtx.booking.durationMinutes} minutes, with ${claimedCtx.tutor.firstName}`,
      customerEmail: claimedCtx.student.parentEmail,
      expiresAt: checkoutExpiresAt(hold, now),
    });
    if (checkout) {
      const { error: saveError } = await db
        .from("bookings")
        .update({ stripe_checkout_session_id: checkout.id, stripe_checkout_url: checkout.url })
        .eq("id", bookingId);
      if (saveError) throw saveError;
    }
  } catch (err) {
    console.error("[claim] checkout failed, releasing the claim", err);
    await db
      .from("bookings")
      .update({
        tutor_id: null,
        start_at: null,
        end_at: null,
        status: "pending",
        accepted_at: null,
        responded_by: null,
        hold_expires_at: null,
      })
      .eq("id", bookingId);
    return { ok: false, message: "Couldn't create the payment link, so the claim was undone. Try again." };
  }

  await emailFamily(claimedCtx, templates.claimed(claimedCtx));
  await notifyAdmins(templates.adminClaimed(claimedCtx));
  return { ok: true, message: "Claimed. The student and parent have the payment link." };
}

export async function closeRequest(db: Db, bookingId: string, actorId: string, now = new Date()): Promise<ActionResult> {
  const ctx = await loadContext(db, bookingId);
  if (!ctx) return { ok: false, message: "Request not found." };
  const check = canClose(ctx.booking);
  if (!check.ok) return { ok: false, message: check.reason };

  const { data, error } = await db
    .from("bookings")
    .update({ status: "declined", declined_at: now.toISOString(), responded_by: actorId })
    .eq("id", bookingId)
    .eq("status", "pending")
    .is("tutor_id", null)
    .select("id");
  if (error) throw error;
  if (!data?.length) return { ok: false, message: "Someone claimed or closed this a moment ago." };

  await emailFamily(ctx, templates.declined(ctx));
  return { ok: true, message: "Closed. The student has been told nobody could take it." };
}

// ---------------------------------------------------------------------------
// 3. Payment
// ---------------------------------------------------------------------------

/** Called by the Stripe webhook when a checkout completes. Idempotent. */
export async function confirmPayment(db: Db, checkoutSessionId: string, bookingIdHint: string | null, now = new Date()) {
  let query = db.from("bookings").select(CONTEXT_SELECT);
  query = bookingIdHint ? query.eq("id", bookingIdHint) : query.eq("stripe_checkout_session_id", checkoutSessionId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) {
    console.error("[payment] no booking for checkout", checkoutSessionId);
    return;
  }
  const row = data as ContextRow;
  if (row.status === "confirmed" && row.paid_at) return; // already handled

  const details = await paymentDetails(checkoutSessionId);
  const paidFields = {
    amount_paid_cents: details.amountCents,
    fee_cents: details.feeCents,
    stripe_payment_intent_id: details.paymentIntentId,
    stripe_checkout_session_id: checkoutSessionId,
    paid_at: now.toISOString(),
  };

  const { error: confirmError } = await db
    .from("bookings")
    .update({ ...paidFields, status: "confirmed", hold_expires_at: null })
    .eq("id", row.id)
    .not("tutor_id", "is", null)
    .in("status", ["awaiting_payment", "expired"]);

  if (confirmError?.code === "23P01") {
    // The hold lapsed and the tutor's time went to someone else before payment landed.
    await db.from("bookings").update(paidFields).eq("id", row.id);
    const ok = await refund(details.paymentIntentId, details.amountCents, row.id).catch(() => false);
    if (ok) await db.from("bookings").update({ refunded_cents: details.amountCents }).eq("id", row.id);
    const ctx = await contextFromRow(db, { ...row, ...paidFields });
    await notifyAdmins(
      templates.adminPaymentProblem(
        ctx,
        ok
          ? "Payment came in after the hold expired and the time was already taken, so it was refunded automatically. Reach out to rebook."
          : "Payment came in after the hold expired and the time was already taken. The automatic refund failed; refund it in Stripe.",
      ),
    );
    return;
  }
  if (confirmError) throw confirmError;

  const ctx = await loadContext(db, row.id);
  if (!ctx) return;
  const claimed = asClaimed(ctx);
  if (ctx.booking.status !== "confirmed" || !claimed) {
    // e.g. paid after an admin cancelled it. Record the money so the totals stay right.
    await db.from("bookings").update(paidFields).eq("id", row.id);
    await notifyAdmins(
      templates.adminPaymentProblem(ctx, `Payment came in for a booking that is ${ctx.booking.status}. Refund it in Stripe or re-confirm it.`),
    );
    return;
  }
  await afterConfirmed(db, claimed);
}

async function afterConfirmed(db: Db, ctx: ClaimedContext) {
  const eventId = await createCalendarEvent(ctx.tutorPrivate?.calendarId ?? null, {
    summary: `${ctx.subject.name} with ${ctx.student.firstName} ${ctx.student.lastName.charAt(0)}.`,
    description: [
      `${ctx.subject.name}${ctx.booking.level === "honors" ? " (Honors)" : ""}, ${ctx.booking.durationMinutes} minutes.`,
      ctx.test ? `Preparing for: ${ctx.test.course}` : "",
      `Dashboard: ${templates.adminUrl()}`,
    ]
      .filter(Boolean)
      .join("\n"),
    location: ctx.tutorPrivate?.zoomLink ?? undefined,
    start: new Date(ctx.booking.startAt),
    end: new Date(ctx.booking.endAt),
  });
  if (eventId) await db.from("bookings").update({ google_event_id: eventId }).eq("id", ctx.booking.id);

  await emailFamily(ctx, templates.confirmed(ctx), true);
  if (ctx.tutorPrivate?.email) {
    await sendEmail({ to: ctx.tutorPrivate.email, ...templates.tutorConfirmed(ctx), attachments: [icsAttachment(ctx)] });
  }
  await notifyAdmins(templates.adminPaid(ctx));
}

/**
 * Local development only: marks a booking paid without Stripe, so the whole
 * flow can be tried before a Stripe account exists.
 */
export async function simulatePayment(token: string, now = new Date()): Promise<ActionResult> {
  const db = createServiceClient();
  const { data } = await db.from("bookings").select("id, status, price_cents").eq("public_token", token).maybeSingle();
  if (!data || data.status !== "awaiting_payment") return { ok: false, message: "Nothing to pay for." };
  const { error } = await db
    .from("bookings")
    .update({ status: "confirmed", paid_at: now.toISOString(), amount_paid_cents: data.price_cents, hold_expires_at: null })
    .eq("id", data.id)
    .eq("status", "awaiting_payment");
  if (error) throw error;
  const ctx = await loadContext(db, data.id);
  const claimed = ctx ? asClaimed(ctx) : null;
  if (claimed) await afterConfirmed(db, claimed);
  return { ok: true };
}

/** Called by the Stripe webhook when a checkout expires unpaid. */
export async function checkoutExpired(db: Db, checkoutSessionId: string, now = new Date()) {
  const { data } = await db
    .from("bookings")
    .update({ status: "expired", expired_at: now.toISOString() })
    .eq("stripe_checkout_session_id", checkoutSessionId)
    .eq("status", "awaiting_payment")
    .select("id");
  for (const row of data ?? []) {
    const ctx = await loadContext(db, row.id);
    if (ctx) await emailFamily(ctx, templates.expired(ctx, "unpaid"));
  }
}

/** Keeps refund totals right when a refund is issued from the Stripe dashboard. */
export async function syncRefund(db: Db, paymentIntentId: string, refundedCents: number) {
  await db.from("bookings").update({ refunded_cents: refundedCents }).eq("stripe_payment_intent_id", paymentIntentId);
}

// ---------------------------------------------------------------------------
// 4. Cancelling
// ---------------------------------------------------------------------------

export type CancelOptions = {
  by: "student" | "admin";
  /** Admin override: "policy" follows the 12-hour rule, "full" refunds anyway, "none" refunds nothing. */
  refund?: "policy" | "full" | "none";
  reason?: string;
};

export async function cancelBooking(db: Db, bookingId: string, opts: CancelOptions, now = new Date()): Promise<ActionResult> {
  const ctx = await loadContext(db, bookingId);
  if (!ctx) return { ok: false, message: "Booking not found." };
  const b = ctx.booking;
  const quote = cancelQuote(b, now);

  let refundCents = 0;
  if (opts.by === "student") {
    if (!quote.allowed) return { ok: false, message: quote.reason };
    refundCents = quote.refundCents;
  } else {
    if (!["pending", "awaiting_payment", "confirmed"].includes(b.status)) {
      return { ok: false, message: "This booking is no longer active." };
    }
    const refundable = Math.max(0, b.amountPaidCents - b.refundedCents);
    refundCents =
      opts.refund === "full" ? refundable : opts.refund === "none" ? 0 : quote.allowed ? quote.refundCents : 0;
  }

  const { data, error } = await db
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: now.toISOString(),
      cancelled_by: opts.by,
      cancel_reason: opts.reason?.slice(0, 500) ?? null,
      hold_expires_at: null,
    })
    .eq("id", bookingId)
    .in("status", ["pending", "awaiting_payment", "confirmed"])
    .select("id");
  if (error) throw error;
  if (!data?.length) return { ok: false, message: "This booking changed a moment ago. Refresh and try again." };

  if (b.status === "awaiting_payment") await expireCheckout(b.stripeCheckoutSessionId);

  let refunded = 0;
  if (refundCents > 0) {
    try {
      if (await refund(b.stripePaymentIntentId, refundCents, b.id)) {
        refunded = refundCents;
        await db.from("bookings").update({ refunded_cents: b.refundedCents + refundCents }).eq("id", b.id);
      }
    } catch (err) {
      console.error("[cancel] refund failed", err);
    }
  }

  await deleteCalendarEvent(ctx.tutorPrivate?.calendarId ?? null, b.googleEventId);
  const fresh = (await loadContext(db, bookingId)) ?? ctx;
  await emailFamily(fresh, templates.cancelled(fresh, refunded));
  await notifyAdmins(templates.adminCancelled(fresh, opts.by === "student" ? "the student" : "an admin", refunded));

  if (refundCents > 0 && refunded === 0) {
    return { ok: true, message: "Cancelled, but the refund didn't go through. Refund it in Stripe." };
  }
  return { ok: true, message: refunded > 0 ? "Cancelled and refunded." : "Cancelled." };
}

// ---------------------------------------------------------------------------
// 5. Housekeeping (lazy on every booking read, and the daily cron)
// ---------------------------------------------------------------------------

/** Expires unclaimed requests and unpaid holds, and tells the student. */
export async function expireStale(db: Db, now = new Date()): Promise<number> {
  const [unclaimed, unpaid] = await Promise.all([
    db
      .from("bookings")
      .update({ status: "expired", expired_at: now.toISOString() })
      .eq("status", "pending")
      .lte("claim_deadline", now.toISOString())
      .select("id"),
    db
      .from("bookings")
      .update({ status: "expired", expired_at: now.toISOString() })
      .eq("status", "awaiting_payment")
      .lte("hold_expires_at", now.toISOString())
      .select("id, stripe_checkout_session_id"),
  ]);
  if (unclaimed.error) throw unclaimed.error;
  if (unpaid.error) throw unpaid.error;

  for (const row of unclaimed.data ?? []) {
    const ctx = await loadContext(db, row.id);
    if (ctx) await emailFamily(ctx, templates.expired(ctx, "no_response"));
  }
  for (const row of unpaid.data ?? []) {
    await expireCheckout(row.stripe_checkout_session_id);
    const ctx = await loadContext(db, row.id);
    if (ctx) await emailFamily(ctx, templates.expired(ctx, "unpaid"));
  }
  return (unclaimed.data?.length ?? 0) + (unpaid.data?.length ?? 0);
}

/** Emails the student, parent and tutor about sessions in the next 24 hours. */
export async function sendReminders(db: Db, now = new Date()): Promise<number> {
  const { data, error } = await db
    .from("bookings")
    .select(CONTEXT_SELECT)
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .gt("start_at", now.toISOString())
    .lte("start_at", new Date(now.getTime() + 24 * 3600_000).toISOString());
  if (error) throw error;

  let sent = 0;
  for (const row of (data ?? []) as ContextRow[]) {
    // Claim the reminder first so an overlapping run can't double-send.
    const { data: marked } = await db
      .from("bookings")
      .update({ reminder_sent_at: now.toISOString() })
      .eq("id", row.id)
      .is("reminder_sent_at", null)
      .select("id");
    if (!marked?.length) continue;
    const ctx = asClaimed(await contextFromRow(db, row));
    if (!ctx) continue;
    await emailFamily(ctx, templates.reminder(ctx));
    if (ctx.tutorPrivate?.email) await sendEmail({ to: ctx.tutorPrivate.email, ...templates.tutorReminder(ctx) });
    sent++;
  }
  return sent;
}

// ---------------------------------------------------------------------------
// 6. The student's booking page
// ---------------------------------------------------------------------------

export type BookingView = {
  token: string;
  status: Booking["status"];
  subjectName: string;
  subjectSlug: string;
  level: Booking["level"];
  tutorFirstName: string | null;
  studentFirstName: string;
  requestedStarts: string[];
  startAt: string | null;
  endAt: string | null;
  durationMinutes: number;
  priceCents: number;
  amountPaidCents: number;
  refundedCents: number;
  holdExpiresAt: string | null;
  checkoutUrl: string | null;
  zoomLink: string | null;
  testCourse: string | null;
  /** What cancelling now would mean, or null if it can't be cancelled. */
  cancel: { refundCents: number; late: boolean } | null;
  /** Whether the dev-only "mark as paid" shortcut applies. */
  canSimulatePayment: boolean;
};

export async function getBookingView(token: string, now = new Date()): Promise<BookingView | null> {
  if (token.length > 64 || (!isPreview && token.length < 16)) return null;
  let ctx: BookingContext;
  if (isPreview) {
    const b = previewBookings(now).find((x) => x.publicToken === token);
    if (!b) return null;
    ctx = {
      booking: b,
      student: previewStudents.find((x) => x.id === b.studentId)!,
      subject: previewSubjects.find((x) => x.id === b.subjectId)!,
      tutor: previewTutors.find((x) => x.id === b.tutorId) ?? null,
      tutorPrivate: previewTutorPrivate.find((x) => x.tutorId === b.tutorId) ?? null,
      test: null,
    };
  } else {
    const db = createServiceClient();
    await expireStale(db, now);
    const { data, error } = await db.from("bookings").select(CONTEXT_SELECT).eq("public_token", token).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    ctx = await contextFromRow(db, data as ContextRow);
  }
  const b = ctx.booking;
  const status = effectiveStatus(b, now);
  return {
    token: b.publicToken,
    status,
    subjectName: ctx.subject.name,
    subjectSlug: ctx.subject.slug,
    level: b.level,
    tutorFirstName: ctx.tutor?.firstName ?? null,
    studentFirstName: ctx.student.firstName,
    requestedStarts: b.requestedStarts,
    startAt: b.startAt,
    endAt: b.endAt,
    durationMinutes: b.durationMinutes,
    priceCents: b.priceCents,
    amountPaidCents: b.amountPaidCents,
    refundedCents: b.refundedCents,
    holdExpiresAt: b.holdExpiresAt,
    checkoutUrl: status === "awaiting_payment" ? b.stripeCheckoutUrl : null,
    zoomLink: status === "confirmed" ? (ctx.tutorPrivate?.zoomLink ?? null) : null,
    testCourse: ctx.test?.course ?? null,
    cancel: (() => {
      if (!["pending", "awaiting_payment", "confirmed"].includes(status)) return null;
      const q = cancelQuote({ ...b, status }, now);
      return q.allowed ? { refundCents: q.refundCents, late: q.late } : null;
    })(),
    canSimulatePayment:
      status === "awaiting_payment" && !b.stripeCheckoutUrl && !isPreview && process.env.NODE_ENV !== "production",
  };
}

export async function cancelByToken(token: string, now = new Date()): Promise<ActionResult> {
  if (isPreview) return { ok: false, message: "Preview mode: nothing to cancel." };
  const db = createServiceClient();
  const { data } = await db.from("bookings").select("id").eq("public_token", token).maybeSingle();
  if (!data) return { ok: false, message: "Booking not found." };
  return cancelBooking(db, data.id, { by: "student" }, now);
}

/** Calendar file for a confirmed booking, for the "Add to calendar" button. */
export async function getBookingIcs(token: string): Promise<string | null> {
  if (isPreview || token.length < 16 || token.length > 64) return null;
  const db = createServiceClient();
  const { data, error } = await db.from("bookings").select(CONTEXT_SELECT).eq("public_token", token).maybeSingle();
  if (error) throw error;
  if (!data || (data as ContextRow).status !== "confirmed") return null;
  const ctx = asClaimed(await contextFromRow(db, data as ContextRow));
  return ctx ? icsAttachment(ctx).content : null;
}
