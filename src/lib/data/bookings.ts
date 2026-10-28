import "server-only";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bookingRules, payout, site } from "@/config/site";
import { assignTutor, exclusionKey } from "@/lib/booking/matching";
import {
  cancelQuote,
  canAccept,
  canDecline,
  checkoutExpiresAt,
  effectiveStatus,
  holdExpiresAt,
  pendingCutoff,
  priceCents,
} from "@/lib/booking/policy";
import { computeSlots, publicSlots, type BusyInterval } from "@/lib/booking/slots";
import type { BookingRequest } from "@/lib/booking/validation";
import { buildIcs } from "@/lib/calendar/ics";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/calendar/google";
import { sendEmail } from "@/lib/email/send";
import * as templates from "@/lib/email/templates";
import type { BookingContext } from "@/lib/email/templates";
import { isPreview } from "@/lib/env";
import { periodFor, sessionLoad } from "@/lib/money";
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
  busy: BusyInterval[];
  load: Map<string, number>;
};

async function loadScheduling(db: Db, now: Date): Promise<Scheduling> {
  const period = periodFor(payout.period, now);
  const since = period.start && period.start < now ? period.start : now;
  const [tutors, availability, bookings] = await Promise.all([
    db.from("tutors").select(TUTOR_SELECT).eq("active", true).order("sort_order"),
    db.from("availability").select("id, tutor_id, weekday, start_minute, end_minute"),
    db
      .from("bookings")
      .select("tutor_id, status, start_at, end_at")
      .in("status", HOLDING_STATUSES as string[])
      .gte("end_at", since.toISOString()),
  ]);
  for (const r of [tutors, availability, bookings]) if (r.error) throw r.error;

  const rows = bookings.data as Pick<BookingRow, "tutor_id" | "status" | "start_at" | "end_at">[];
  return {
    tutors: (tutors.data as TutorRow[]).map(toTutor),
    availability: (availability.data as AvailabilityRow[]).map(toAvailability),
    busy: rows.map((b) => ({ tutorId: b.tutor_id, start: new Date(b.start_at), end: new Date(b.end_at) })),
    load: sessionLoad(
      rows.map((b) => ({ tutorId: b.tutor_id, status: b.status, startAt: b.start_at })),
      period,
    ),
  };
}

function previewScheduling(now: Date): Scheduling {
  const bookings = previewBookings(now).filter((b) => HOLDING_STATUSES.includes(effectiveStatus(b, now)));
  return {
    tutors: previewTutors,
    availability: previewAvailability,
    busy: bookings.map((b) => ({ tutorId: b.tutorId, start: new Date(b.startAt), end: new Date(b.endAt) })),
    load: sessionLoad(bookings, periodFor(payout.period, now)),
  };
}

/** Open start times for a subject. Times only; who is free is never exposed. */
export async function getOpenSlots(subjectId: string, durationMinutes: number, now = new Date()) {
  let scheduling: Scheduling;
  if (isPreview) {
    scheduling = previewScheduling(now);
  } else {
    const db = createServiceClient();
    await expireStale(db, now);
    scheduling = await loadScheduling(db, now);
  }
  return publicSlots(
    computeSlots({ subjectId, durationMinutes, now, rules: bookingRules, ...scheduling }),
  );
}

// ---------------------------------------------------------------------------
// Context for emails and actions
// ---------------------------------------------------------------------------

const CONTEXT_SELECT =
  "*, students(*), subjects(*), tutors!bookings_tutor_id_fkey(id, first_name, last_name, grade, active, sort_order), tests(id, subject_id, course, level, test_date)";

type ContextRow = BookingRow & {
  students: StudentRow;
  subjects: SubjectRow;
  tutors: TutorRow;
  tests: TestRow | null;
};

async function contextFromRow(db: Db, row: ContextRow): Promise<BookingContext> {
  const { data: priv } = await db
    .from("tutor_private")
    .select("tutor_id, email, zoom_link, calendar_id")
    .eq("tutor_id", row.tutor_id)
    .maybeSingle();
  return {
    booking: toBooking(row),
    student: toStudent(row.students),
    subject: toSubject(row.subjects),
    tutor: toTutor(row.tutors),
    tutorPrivate: priv ? toTutorPrivate(priv as TutorPrivateRow) : null,
    test: row.tests ? toTest(row.tests) : null,
  };
}

async function loadContext(db: Db, bookingId: string): Promise<BookingContext | null> {
  const { data, error } = await db.from("bookings").select(CONTEXT_SELECT).eq("id", bookingId).maybeSingle();
  if (error) throw error;
  return data ? contextFromRow(db, data as ContextRow) : null;
}

function familyRecipients(ctx: BookingContext) {
  return { to: ctx.student.email, cc: ctx.student.parentEmail };
}

async function emailFamily(ctx: BookingContext, email: templates.RenderedEmail, attachIcs = false) {
  await sendEmail({
    ...familyRecipients(ctx),
    ...email,
    attachments: attachIcs ? [icsAttachment(ctx)] : undefined,
  });
}

function icsAttachment(ctx: BookingContext, status: "CONFIRMED" | "CANCELLED" = "CONFIRMED") {
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
// 1. A student requests a session
// ---------------------------------------------------------------------------

export type CreateResult =
  | { ok: true; token: string; startAt: string; preferenceIndex: number }
  | { ok: false; status: number; message: string };

const NO_SLOT = "Those times were just taken. Please pick another time.";

export async function createBookingRequest(req: BookingRequest, now = new Date()): Promise<CreateResult> {
  if (isPreview) {
    const subject = previewSubjects.find((s) => s.id === req.subjectId);
    if (!subject) return { ok: false, status: 400, message: "That subject isn't offered." };
    const slots = computeSlots({
      subjectId: req.subjectId,
      durationMinutes: req.durationMinutes,
      now,
      rules: bookingRules,
      ...previewScheduling(now),
    });
    const s = previewScheduling(now);
    const a = assignTutor({ preferences: req.preferences, slots, load: s.load, order: s.tutors.map((t) => t.id) });
    if (!a) return { ok: false, status: 409, message: NO_SLOT };
    return { ok: true, token: "preview", startAt: a.start, preferenceIndex: a.preferenceIndex };
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
  const order = scheduling.tutors.map((t) => t.id);

  // Check there's a match before saving anything about the student.
  if (!assignTutor({ preferences: req.preferences, slots, load: scheduling.load, order })) {
    return { ok: false, status: 409, message: NO_SLOT };
  }

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

  const exclude = new Set<string>();
  for (let attempt = 0; attempt < 4; attempt++) {
    const a = assignTutor({ preferences: req.preferences, slots, load: scheduling.load, order, exclude });
    if (!a) return { ok: false, status: 409, message: NO_SLOT };

    const start = new Date(a.start);
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
        requested_starts: req.preferences.map((p) => new Date(p).toISOString()),
        start_at: start.toISOString(),
        end_at: new Date(start.getTime() + req.durationMinutes * 60_000).toISOString(),
        tutor_id: a.tutorId,
        status: "pending",
        price_cents: priceCents(req.durationMinutes),
        consent_at: now.toISOString(),
      })
      .select("id")
      .single();

    if (error?.code === "23P01") {
      // Someone else grabbed this tutor at this time a moment ago. Try the next option.
      exclude.add(exclusionKey(a.tutorId, a.start));
      continue;
    }
    if (error) throw error;

    const ctx = await loadContext(db, data.id);
    if (ctx) {
      await emailFamily(ctx, templates.requestReceived(ctx));
      await notifyAdmins(templates.adminNewRequest(ctx));
    }
    return { ok: true, token, startAt: a.start, preferenceIndex: a.preferenceIndex };
  }
  return { ok: false, status: 409, message: NO_SLOT };
}

// ---------------------------------------------------------------------------
// 2. A tutor accepts or declines
// ---------------------------------------------------------------------------

export async function acceptBooking(db: Db, bookingId: string, actorId: string, now = new Date()): Promise<ActionResult> {
  const ctx = await loadContext(db, bookingId);
  if (!ctx) return { ok: false, message: "Booking not found." };
  const check = canAccept(ctx.booking, now);
  if (!check.ok) return { ok: false, message: check.reason };

  const hold = holdExpiresAt(now, new Date(ctx.booking.startAt));

  // Claim it first so two admins can't both accept.
  const { data: claimed, error } = await db
    .from("bookings")
    .update({
      status: "awaiting_payment",
      accepted_at: now.toISOString(),
      responded_by: actorId,
      hold_expires_at: hold.toISOString(),
    })
    .eq("id", bookingId)
    .eq("status", "pending")
    .select("id");
  if (error) throw error;
  if (!claimed?.length) return { ok: false, message: "Someone already responded to this request." };

  try {
    const checkout = await createCheckout({
      bookingId,
      publicToken: ctx.booking.publicToken,
      amountCents: ctx.booking.priceCents,
      description: `${ctx.subject.name} session, ${ctx.booking.durationMinutes} minutes, with ${ctx.tutor.firstName}`,
      customerEmail: ctx.student.parentEmail,
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
    console.error("[accept] checkout failed, reverting", err);
    await db
      .from("bookings")
      .update({ status: "pending", accepted_at: null, responded_by: null, hold_expires_at: null })
      .eq("id", bookingId);
    return { ok: false, message: "Couldn't create the payment link. Nothing changed; try again." };
  }

  const updated = await loadContext(db, bookingId);
  if (updated) await emailFamily(updated, templates.accepted(updated));
  return { ok: true, message: "Accepted. The student has been sent a payment link." };
}

export async function declineBooking(db: Db, bookingId: string, actorId: string, now = new Date()): Promise<ActionResult> {
  const ctx = await loadContext(db, bookingId);
  if (!ctx) return { ok: false, message: "Booking not found." };
  const check = canDecline(ctx.booking);
  if (!check.ok) return { ok: false, message: check.reason };

  const { data, error } = await db
    .from("bookings")
    .update({ status: "declined", declined_at: now.toISOString(), responded_by: actorId })
    .eq("id", bookingId)
    .eq("status", "pending")
    .select("id");
  if (error) throw error;
  if (!data?.length) return { ok: false, message: "Someone already responded to this request." };

  await emailFamily(ctx, templates.declined(ctx));
  return { ok: true, message: "Declined. The student has been told and the time is free again." };
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
    .in("status", ["awaiting_payment", "expired"]);

  if (confirmError?.code === "23P01") {
    // The hold lapsed and the time was given to someone else before payment landed.
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
  if (ctx.booking.status !== "confirmed") {
    // e.g. paid after an admin cancelled it. Record the money so the totals stay right.
    await db.from("bookings").update(paidFields).eq("id", row.id);
    await notifyAdmins(
      templates.adminPaymentProblem(ctx, `Payment came in for a booking that is ${ctx.booking.status}. Refund it in Stripe or re-confirm it.`),
    );
    return;
  }
  await afterConfirmed(db, ctx);
}

async function afterConfirmed(db: Db, ctx: BookingContext) {
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
  if (ctx) await afterConfirmed(db, ctx);
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

/** Expires unanswered requests and unpaid holds, and tells the student. */
export async function expireStale(db: Db, now = new Date()): Promise<number> {
  const [pending, unpaid] = await Promise.all([
    db
      .from("bookings")
      .update({ status: "expired", expired_at: now.toISOString() })
      .eq("status", "pending")
      .lte("start_at", pendingCutoff(now).toISOString())
      .select("id"),
    db
      .from("bookings")
      .update({ status: "expired", expired_at: now.toISOString() })
      .eq("status", "awaiting_payment")
      .lte("hold_expires_at", now.toISOString())
      .select("id, stripe_checkout_session_id"),
  ]);
  if (pending.error) throw pending.error;
  if (unpaid.error) throw unpaid.error;

  for (const row of pending.data ?? []) {
    const ctx = await loadContext(db, row.id);
    if (ctx) await emailFamily(ctx, templates.expired(ctx, "no_response"));
  }
  for (const row of unpaid.data ?? []) {
    await expireCheckout(row.stripe_checkout_session_id);
    const ctx = await loadContext(db, row.id);
    if (ctx) await emailFamily(ctx, templates.expired(ctx, "unpaid"));
  }
  return (pending.data?.length ?? 0) + (unpaid.data?.length ?? 0);
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
    const { data: claimed } = await db
      .from("bookings")
      .update({ reminder_sent_at: now.toISOString() })
      .eq("id", row.id)
      .is("reminder_sent_at", null)
      .select("id");
    if (!claimed?.length) continue;
    const ctx = await contextFromRow(db, row);
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
  tutorFirstName: string;
  studentFirstName: string;
  startAt: string;
  endAt: string;
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
  if (token.length < 16 || token.length > 64) return null;
  let ctx: Pick<BookingContext, "booking" | "student" | "subject" | "tutor" | "tutorPrivate" | "test">;
  if (isPreview) {
    const b = previewBookings(now).find((x) => x.publicToken === token);
    if (!b) return null;
    ctx = {
      booking: b,
      student: previewStudents.find((x) => x.id === b.studentId)!,
      subject: previewSubjects.find((x) => x.id === b.subjectId)!,
      tutor: previewTutors.find((x) => x.id === b.tutorId)!,
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
    tutorFirstName: ctx.tutor.firstName,
    studentFirstName: ctx.student.firstName,
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
      const q = cancelQuote(b, now);
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
  const ctx = await contextFromRow(db, data as ContextRow);
  return icsAttachment(ctx).content;
}
