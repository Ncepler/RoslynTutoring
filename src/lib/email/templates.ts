/**
 * Every email the site sends. Copy is plain and specific: what happened,
 * what happens next, and the one link that matters.
 */

import { bookingRules, site } from "@/config/site";
import { formatPrice } from "@/lib/booking/policy";
import { formatCents } from "@/lib/money";
import { formatDateTime, formatTime } from "@/lib/time";
import type { Booking, Student, Subject, TestEvent, Tutor, TutorPrivate } from "@/lib/types";
import { renderEmail, type EmailBlock } from "./layout";

export type BookingContext = {
  booking: Booking;
  student: Student;
  subject: Subject;
  tutor: Tutor;
  tutorPrivate: TutorPrivate | null;
  test: TestEvent | null;
};

export type RenderedEmail = { subject: string; html: string; text: string };

export const bookingUrl = (b: Pick<Booking, "publicToken">) => `${site.url}/booking/${b.publicToken}`;
export const adminUrl = (path = "") => `${site.url}/admin${path}`;

function subjectLabel(ctx: BookingContext) {
  return ctx.booking.level === "honors" ? `${ctx.subject.name} (Honors)` : ctx.subject.name;
}

function when(b: Booking) {
  return `${formatDateTime(b.startAt)} to ${formatTime(b.endAt)} ET`;
}

function details(ctx: BookingContext, extra: [string, string][] = []): EmailBlock {
  const rows: [string, string][] = [
    ["Subject", subjectLabel(ctx)],
    ["When", when(ctx.booking)],
    ["Length", `${ctx.booking.durationMinutes} minutes`],
    ["Tutor", `${ctx.tutor.firstName} ${ctx.tutor.lastName}`],
  ];
  if (ctx.test) rows.push(["Preparing for", ctx.test.course]);
  return { type: "details", rows: [...rows, ...extra] };
}

function email(subject: string, heading: string, blocks: EmailBlock[]): RenderedEmail {
  return { subject, ...renderEmail(heading, blocks) };
}

// ---------------------------------------------------------------------------
// To the student (parent cc'd)
// ---------------------------------------------------------------------------

export function requestReceived(ctx: BookingContext): RenderedEmail {
  return email(`We got your ${ctx.subject.name} request`, `Thanks, ${ctx.student.firstName}. Your request is in.`, [
    {
      type: "p",
      text: `${ctx.tutor.firstName} has been matched to your request and will accept or decline soon. Nothing is charged yet.`,
    },
    details(ctx, [["Price", formatPrice(ctx.booking.priceCents)]]),
    {
      type: "p",
      text: `If ${ctx.tutor.firstName} accepts, you'll get a payment link. The time is held for you until you pay, up to ${bookingRules.holdHours} hours.`,
    },
    { type: "button", label: "Check your request", href: bookingUrl(ctx.booking) },
  ]);
}

export function accepted(ctx: BookingContext): RenderedEmail {
  const hold = ctx.booking.holdExpiresAt ? formatDateTime(ctx.booking.holdExpiresAt) : null;
  return email(`Accepted: pay to confirm your ${ctx.subject.name} session`, `${ctx.tutor.firstName} accepted your session.`, [
    { type: "p", text: "Pay to lock it in. Your session is confirmed as soon as payment goes through." },
    details(ctx, [["Price", formatPrice(ctx.booking.priceCents)]]),
    { type: "button", label: `Pay ${formatPrice(ctx.booking.priceCents)}`, href: bookingUrl(ctx.booking) },
    hold
      ? { type: "note", text: `We're holding this time until ${hold} ET. After that it's released.` }
      : { type: "note", text: "We're holding this time for a limited window." },
  ]);
}

export function declined(ctx: BookingContext): RenderedEmail {
  return email(`Your ${ctx.subject.name} request wasn't accepted`, "That time didn't work out.", [
    {
      type: "p",
      text: `${ctx.tutor.firstName} couldn't take this session, so the time has been released. You haven't been charged.`,
    },
    details(ctx),
    { type: "p", text: "You can pick another time. Most of us have several afternoons open each week." },
    { type: "button", label: "Pick another time", href: `${site.url}/book?subject=${ctx.subject.slug}` },
  ]);
}

export function confirmed(ctx: BookingContext): RenderedEmail {
  const zoom = ctx.tutorPrivate?.zoomLink;
  return email(`Confirmed: ${ctx.subject.name}, ${formatDateTime(ctx.booking.startAt)}`, "You're booked.", [
    { type: "p", text: "Payment received. Here's everything you need." },
    details(ctx, [
      ["Paid", formatPrice(ctx.booking.amountPaidCents || ctx.booking.priceCents)],
      ["Zoom", zoom ?? "Your tutor will email the Zoom link before the session."],
    ]),
    ...(zoom ? [{ type: "button", label: "Join on Zoom", href: zoom } as EmailBlock] : []),
    {
      type: "p",
      text: "Bring your notes, a recent test or quiz if you have one, and the topics you're unsure about. The calendar file attached adds the session to your calendar.",
    },
    {
      type: "note",
      text: `Need to cancel or reschedule? It's free up to ${bookingRules.freeCancelHours} hours before. Later cancels and no-shows aren't refunded.`,
    },
    { type: "button", label: "Manage booking", href: bookingUrl(ctx.booking) },
  ]);
}

export function reminder(ctx: BookingContext): RenderedEmail {
  const zoom = ctx.tutorPrivate?.zoomLink;
  return email(`Today at ${formatTime(ctx.booking.startAt)}: ${ctx.subject.name} review`, "Your session is today.", [
    details(ctx, [["Zoom", zoom ?? "Your tutor will send the link."]]),
    ...(zoom ? [{ type: "button", label: "Join on Zoom", href: zoom } as EmailBlock] : []),
    { type: "note", text: "Have your notes and questions ready. See you soon." },
  ]);
}

export function expired(ctx: BookingContext, reason: "no_response" | "unpaid"): RenderedEmail {
  const text =
    reason === "unpaid"
      ? "The payment window closed before payment came through, so the time has been released. You haven't been charged."
      : "No tutor was able to confirm this time soon enough, so the request has been closed. You haven't been charged.";
  return email(`Your ${ctx.subject.name} request expired`, "This request has expired.", [
    { type: "p", text },
    details(ctx),
    { type: "button", label: "Book a new time", href: `${site.url}/book?subject=${ctx.subject.slug}` },
  ]);
}

export function cancelled(ctx: BookingContext, refundCents: number): RenderedEmail {
  const blocks: EmailBlock[] = [{ type: "p", text: "This session has been cancelled." }, details(ctx)];
  if (refundCents > 0) {
    blocks.push({
      type: "p",
      text: `A refund of ${formatCents(refundCents)} is on its way. It usually shows up in 5 to 10 business days.`,
    });
  } else if (ctx.booking.amountPaidCents > 0) {
    blocks.push({
      type: "note",
      text: `Because this was cancelled less than ${bookingRules.freeCancelHours} hours before the session, it isn't refunded. If something came up, reply to this email.`,
    });
  }
  blocks.push({ type: "button", label: "Book another time", href: `${site.url}/book?subject=${ctx.subject.slug}` });
  return email(`Cancelled: ${ctx.subject.name}, ${formatDateTime(ctx.booking.startAt)}`, "Your session is cancelled.", blocks);
}

// ---------------------------------------------------------------------------
// To the tutor and the admins
// ---------------------------------------------------------------------------

export function tutorConfirmed(ctx: BookingContext): RenderedEmail {
  return email(
    `Booked: ${ctx.subject.name} with ${ctx.student.firstName}, ${formatDateTime(ctx.booking.startAt)}`,
    `${ctx.student.firstName} paid. You're on.`,
    [
      details(ctx, [
        ["Student", `${ctx.student.firstName} ${ctx.student.lastName}, grade ${ctx.student.grade}`],
        ["Zoom", ctx.tutorPrivate?.zoomLink ?? "No Zoom link on your profile. Add one in the dashboard and email it to the student."],
      ]),
      { type: "note", text: "The calendar file attached adds this to your calendar." },
      { type: "button", label: "Open dashboard", href: adminUrl() },
    ],
  );
}

export function tutorReminder(ctx: BookingContext): RenderedEmail {
  return email(
    `Today at ${formatTime(ctx.booking.startAt)}: ${ctx.subject.name} with ${ctx.student.firstName}`,
    "You have a session today.",
    [
      details(ctx, [["Student", `${ctx.student.firstName} ${ctx.student.lastName}, grade ${ctx.student.grade}`]]),
      { type: "button", label: "Open dashboard", href: adminUrl() },
    ],
  );
}

export function adminNewRequest(ctx: BookingContext): RenderedEmail {
  return email(
    `New request: ${ctx.subject.name}, ${formatDateTime(ctx.booking.startAt)} (${ctx.tutor.firstName})`,
    `New ${ctx.subject.name} request for ${ctx.tutor.firstName}.`,
    [
      details(ctx, [
        ["Student", `${ctx.student.firstName} ${ctx.student.lastName}, grade ${ctx.student.grade}`],
        ["Price", formatPrice(ctx.booking.priceCents)],
      ]),
      { type: "p", text: `${ctx.tutor.firstName}, accept or decline from the dashboard. Payment is only requested after you accept.` },
      { type: "button", label: "Accept or decline", href: adminUrl() },
    ],
  );
}

export function adminPaid(ctx: BookingContext): RenderedEmail {
  return email(
    `Paid: ${ctx.subject.name}, ${formatDateTime(ctx.booking.startAt)} (${ctx.tutor.firstName})`,
    `${formatPrice(ctx.booking.amountPaidCents)} received.`,
    [details(ctx, [["Student", `${ctx.student.firstName} ${ctx.student.lastName}`]]), { type: "button", label: "Open dashboard", href: adminUrl() }],
  );
}

export function adminCancelled(ctx: BookingContext, by: string, refundCents: number): RenderedEmail {
  return email(
    `Cancelled by ${by}: ${ctx.subject.name}, ${formatDateTime(ctx.booking.startAt)} (${ctx.tutor.firstName})`,
    `Session cancelled by ${by}.`,
    [
      details(ctx, [
        ["Student", `${ctx.student.firstName} ${ctx.student.lastName}`],
        ["Refunded", refundCents > 0 ? formatCents(refundCents) : "Nothing"],
      ]),
      { type: "button", label: "Open dashboard", href: adminUrl("/bookings") },
    ],
  );
}

export function adminPaymentProblem(ctx: BookingContext, problem: string): RenderedEmail {
  return email(`Needs attention: payment for ${ctx.subject.name} with ${ctx.student.firstName}`, "A payment needs a look.", [
    { type: "p", text: problem },
    details(ctx, [["Student", `${ctx.student.firstName} ${ctx.student.lastName}`]]),
    { type: "button", label: "Open dashboard", href: adminUrl("/bookings") },
  ]);
}

export function adminReport(report: {
  topic: string;
  message: string;
  name: string;
  email: string;
  page: string;
}): RenderedEmail {
  return email(`Problem reported: ${report.topic}`, "Someone reported a problem.", [
    {
      type: "details",
      rows: [
        ["Topic", report.topic],
        ["From", [report.name, report.email].filter(Boolean).join(", ") || "Anonymous"],
        ["Page", report.page || "Not given"],
      ],
    },
    { type: "p", text: report.message },
    { type: "button", label: "Open reports", href: adminUrl("/reports") },
  ]);
}
