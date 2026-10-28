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
  /** Null until a founder claims the request. */
  tutor: Tutor | null;
  tutorPrivate: TutorPrivate | null;
  test: TestEvent | null;
};

/** A request a founder has claimed: it has a tutor and a fixed time. */
export type ClaimedContext = BookingContext & {
  tutor: Tutor;
  booking: Booking & { tutorId: string; startAt: string; endAt: string };
};

export function asClaimed(ctx: BookingContext): ClaimedContext | null {
  const b = ctx.booking;
  return ctx.tutor && b.tutorId && b.startAt && b.endAt ? (ctx as ClaimedContext) : null;
}

export type RenderedEmail = { subject: string; html: string; text: string };

export const bookingUrl = (b: Pick<Booking, "publicToken">) => `${site.url}/booking/${b.publicToken}`;
export const adminUrl = (path = "") => `${site.url}/admin${path}`;

function subjectLabel(ctx: BookingContext) {
  return ctx.booking.level === "honors" ? `${ctx.subject.name} (Honors)` : ctx.subject.name;
}

function pickedTimes(b: Booking) {
  return b.requestedStarts.map((s, i) => `${i + 1}. ${formatDateTime(s)} ET`).join("\n");
}

/** Session details. Claimed bookings show the time and tutor; open requests show the picked times. */
function details(ctx: BookingContext, extra: [string, string][] = []): EmailBlock {
  const claimed = asClaimed(ctx);
  const rows: [string, string][] = [["Subject", subjectLabel(ctx)]];
  if (claimed) {
    rows.push(
      ["When", `${formatDateTime(claimed.booking.startAt)} to ${formatTime(claimed.booking.endAt)} ET`],
      ["Length", `${ctx.booking.durationMinutes} minutes`],
      ["Tutor", `${claimed.tutor.firstName} ${claimed.tutor.lastName}`],
    );
  } else {
    rows.push(["Times picked", pickedTimes(ctx.booking)], ["Length", `${ctx.booking.durationMinutes} minutes`]);
  }
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
      text: "It went to all of our tutors. The first one who can take one of your times claims it, and you'll get an email with the time and a payment link. Nothing is charged yet.",
    },
    details(ctx, [["Price", formatPrice(ctx.booking.priceCents)]]),
    {
      type: "p",
      text: `Once a tutor claims it, the time is held for you until you pay, up to ${bookingRules.holdHours} hours.`,
    },
    { type: "button", label: "Check your request", href: bookingUrl(ctx.booking) },
  ]);
}

export function claimed(ctx: ClaimedContext): RenderedEmail {
  const hold = ctx.booking.holdExpiresAt ? formatDateTime(ctx.booking.holdExpiresAt) : null;
  return email(
    `${ctx.tutor.firstName} can do ${formatDateTime(ctx.booking.startAt)}: pay to confirm`,
    `${ctx.tutor.firstName} will tutor you.`,
    [
      { type: "p", text: "Pay to lock in the time. Your session is confirmed as soon as payment goes through." },
      details(ctx, [["Price", formatPrice(ctx.booking.priceCents)]]),
      { type: "button", label: `Pay ${formatPrice(ctx.booking.priceCents)}`, href: bookingUrl(ctx.booking) },
      hold
        ? { type: "note", text: `We're holding this time until ${hold} ET. After that it's released.` }
        : { type: "note", text: "We're holding this time for a limited window." },
    ],
  );
}

export function declined(ctx: BookingContext): RenderedEmail {
  return email(`No tutor could take your ${ctx.subject.name} request`, "Those times didn't work out.", [
    { type: "p", text: "None of our tutors could take any of the times you picked, so the request is closed. You haven't been charged." },
    details(ctx),
    { type: "p", text: "You can try other times. Our tutors update their hours often." },
    { type: "button", label: "Pick other times", href: `${site.url}/book?subject=${ctx.subject.slug}` },
  ]);
}

export function confirmed(ctx: ClaimedContext): RenderedEmail {
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

export function reminder(ctx: ClaimedContext): RenderedEmail {
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
      : "No tutor was able to claim one of your times soon enough, so the request has been closed. You haven't been charged.";
  return email(`Your ${ctx.subject.name} request expired`, "This request has expired.", [
    { type: "p", text },
    details(ctx),
    { type: "button", label: "Book a new time", href: `${site.url}/book?subject=${ctx.subject.slug}` },
  ]);
}

export function cancelled(ctx: BookingContext, refundCents: number): RenderedEmail {
  const claimed = asClaimed(ctx);
  const blocks: EmailBlock[] = [
    { type: "p", text: claimed ? "This session has been cancelled." : "This request has been cancelled." },
    details(ctx),
  ];
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
  return email(
    claimed ? `Cancelled: ${ctx.subject.name}, ${formatDateTime(claimed.booking.startAt)}` : `Cancelled: your ${ctx.subject.name} request`,
    claimed ? "Your session is cancelled." : "Your request is cancelled.",
    blocks,
  );
}

// ---------------------------------------------------------------------------
// To the tutor and the admins
// ---------------------------------------------------------------------------

export function tutorConfirmed(ctx: ClaimedContext): RenderedEmail {
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

export function tutorReminder(ctx: ClaimedContext): RenderedEmail {
  return email(
    `Today at ${formatTime(ctx.booking.startAt)}: ${ctx.subject.name} with ${ctx.student.firstName}`,
    "You have a session today.",
    [
      details(ctx, [["Student", `${ctx.student.firstName} ${ctx.student.lastName}, grade ${ctx.student.grade}`]]),
      { type: "button", label: "Open dashboard", href: adminUrl() },
    ],
  );
}

/** Sent to all four founders. The first one who can take it claims it. */
export function adminNewRequest(ctx: BookingContext, times: { start: string; free: string[] }[]): RenderedEmail {
  return email(
    `New request to claim: ${subjectLabel(ctx)}, ${ctx.booking.durationMinutes} min`,
    `New ${ctx.subject.name} request. Who can take it?`,
    [
      {
        type: "details",
        rows: [
          ["Subject", subjectLabel(ctx)],
          ["Length", `${ctx.booking.durationMinutes} minutes · ${formatPrice(ctx.booking.priceCents)}`],
          ["Student", `${ctx.student.firstName} ${ctx.student.lastName}, grade ${ctx.student.grade}`],
          ...(ctx.test ? ([["Preparing for", ctx.test.course]] as [string, string][]) : []),
          ...times.map(
            (t, i) =>
              [
                `Choice ${i + 1}`,
                `${formatDateTime(t.start)} ET${t.free.length ? ` (free by your hours: ${t.free.join(", ")})` : ""}`,
              ] as [string, string],
          ),
        ],
      },
      { type: "p", text: "Open the dashboard and claim one of the student's times. Payment is requested only after someone claims it." },
      { type: "button", label: "Claim it", href: adminUrl() },
    ],
  );
}

/** Tells everyone a request is taken, so nobody else chases it. */
export function adminClaimed(ctx: ClaimedContext): RenderedEmail {
  return email(
    `Claimed by ${ctx.tutor.firstName}: ${ctx.subject.name}, ${formatDateTime(ctx.booking.startAt)}`,
    `${ctx.tutor.firstName} claimed the ${ctx.subject.name} request.`,
    [
      details(ctx, [["Student", `${ctx.student.firstName} ${ctx.student.lastName}`]]),
      { type: "note", text: "The student and parent have the payment link. Nothing for anyone else to do." },
    ],
  );
}

export function adminPaid(ctx: ClaimedContext): RenderedEmail {
  return email(
    `Paid: ${ctx.subject.name}, ${formatDateTime(ctx.booking.startAt)} (${ctx.tutor.firstName})`,
    `${formatPrice(ctx.booking.amountPaidCents)} received.`,
    [details(ctx, [["Student", `${ctx.student.firstName} ${ctx.student.lastName}`]]), { type: "button", label: "Open dashboard", href: adminUrl() }],
  );
}

export function adminCancelled(ctx: BookingContext, by: string, refundCents: number): RenderedEmail {
  const claimed = asClaimed(ctx);
  return email(
    `Cancelled by ${by}: ${ctx.subject.name}${claimed ? `, ${formatDateTime(claimed.booking.startAt)} (${claimed.tutor.firstName})` : " request"}`,
    `${claimed ? "Session" : "Request"} cancelled by ${by}.`,
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
