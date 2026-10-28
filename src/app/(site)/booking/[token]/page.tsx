import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { site } from "@/config/site";
import { ArrowRight, Calendar, Check, Clock, Video } from "@/components/icons";
import { BookingActions, PaidPoller } from "@/components/book/booking-actions";
import { formatPrice } from "@/lib/booking/policy";
import { getBookingView, type BookingView } from "@/lib/data/bookings";
import { formatCents } from "@/lib/money";
import { formatDateTime, formatDayLong, formatTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Your booking",
  robots: { index: false, follow: false },
};

export default function BookingPage(props: PageProps<"/booking/[token]">) {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 pb-20 sm:px-6 md:pt-16">
      <Suspense fallback={<div className="h-96 animate-pulse bg-bg-subtle" />}>
        <BookingStatus {...props} />
      </Suspense>
    </div>
  );
}

const HEADLINE: Record<BookingView["status"], (v: BookingView) => { title: string; body: string }> = {
  pending: () => ({
    title: "Waiting for a tutor to claim it.",
    body: "Your request went to all of our tutors. When one of them claims one of your times, you'll get an email with the time and a payment link. Nothing is charged yet.",
  }),
  awaiting_payment: (v) => ({
    title: `${v.tutorFirstName ?? "A tutor"} can do it. Pay to confirm.`,
    body: "Your session is confirmed as soon as payment goes through.",
  }),
  confirmed: () => ({
    title: "You're booked.",
    body: "Your confirmation email has the Zoom link and a calendar file.",
  }),
  declined: () => ({
    title: "Those times didn't work out.",
    body: "None of our tutors could take the times you picked, so the request was closed. You weren't charged.",
  }),
  expired: () => ({
    title: "This request expired.",
    body: "It wasn't confirmed in time, so the time was released. You weren't charged.",
  }),
  cancelled: () => ({ title: "This session was cancelled.", body: "" }),
};

const BADGE: Record<BookingView["status"], { label: string; className: string }> = {
  pending: { label: "Waiting for a tutor", className: "bg-accent-soft text-accent-soft-ink" },
  awaiting_payment: { label: "Awaiting payment", className: "bg-warn-soft text-warn" },
  confirmed: { label: "Confirmed", className: "bg-success-soft text-success" },
  declined: { label: "Closed", className: "bg-bg-subtle text-muted" },
  expired: { label: "Expired", className: "bg-bg-subtle text-muted" },
  cancelled: { label: "Cancelled", className: "bg-bg-subtle text-muted" },
};

async function BookingStatus({ params, searchParams }: PageProps<"/booking/[token]">) {
  const { token } = await params;
  const { paid } = await searchParams;
  const view = await getBookingView(token);
  if (!view) notFound();

  const head = HEADLINE[view.status](view);
  const badge = BADGE[view.status];
  const justPaid = paid === "1" && view.status === "awaiting_payment";
  const refunded = view.refundedCents > 0;

  return (
    <div className="swap-in">
      <span className={`inline-flex px-3 py-1 text-[0.8125rem] font-semibold ${badge.className}`}>
        {badge.label}
      </span>
      <h1 className="t-h2 mt-4">{justPaid ? "Payment received." : head.title}</h1>
      <p className="t-lead mt-3">
        {justPaid
          ? "We're confirming it now. This page will update in a moment."
          : view.status === "cancelled"
            ? refunded
              ? `A refund of ${formatCents(view.refundedCents)} is on its way. It usually shows up in 5 to 10 business days.`
              : view.amountPaidCents > 0
                ? "It was cancelled close to the session, so it wasn't refunded."
                : "You weren't charged."
            : head.body}
      </p>
      {justPaid && <PaidPoller />}

      <dl className="card mt-8 divide-y divide-line p-0">
        {view.startAt && view.endAt ? (
          <Row icon={<Calendar size={18} />} label="When">
            {formatDayLong(view.startAt)}
            <span className="block text-muted">
              {formatTime(view.startAt)} to {formatTime(view.endAt)} ET · {view.durationMinutes} minutes
            </span>
          </Row>
        ) : (
          <Row icon={<Calendar size={18} />} label={`Times you picked · ${view.durationMinutes} minutes`}>
            <ol className="space-y-0.5">
              {view.requestedStarts.map((s, i) => (
                <li key={s}>
                  <span className="mr-2 font-semibold text-accent-text">{i + 1}</span>
                  {formatDateTime(s)} ET
                </li>
              ))}
            </ol>
          </Row>
        )}
        <Row icon={<Check size={18} />} label="Subject">
          {view.subjectName}
          {view.level === "honors" ? " (Honors)" : ""}
          {view.testCourse && <span className="block text-muted">Preparing for {view.testCourse}</span>}
        </Row>
        <Row icon={<Video size={18} />} label="Tutor">
          {view.tutorFirstName ? `${view.tutorFirstName}, on Zoom` : "Not claimed yet"}
        </Row>
        <Row icon={<Clock size={18} />} label="Price">
          {view.amountPaidCents > 0 ? `${formatCents(view.amountPaidCents)} paid` : formatPrice(view.priceCents)}
        </Row>
      </dl>

      {view.status === "awaiting_payment" && !justPaid && view.holdExpiresAt && (
        <p className="mt-4 text-sm text-muted">We&apos;re holding this time until {formatDateTime(view.holdExpiresAt)} ET.</p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {view.status === "awaiting_payment" && !justPaid && view.checkoutUrl && (
          <a href={view.checkoutUrl} className="btn btn-primary btn-lg">
            Pay {formatPrice(view.priceCents)} <ArrowRight size={18} />
          </a>
        )}
        {view.status === "confirmed" && view.zoomLink && (
          <a href={view.zoomLink} className="btn btn-primary btn-lg" target="_blank" rel="noreferrer">
            <Video size={18} /> Join on Zoom
          </a>
        )}
        {view.status === "confirmed" && (
          <a href={`/booking/${view.token}/calendar.ics`} className="btn btn-secondary btn-lg">
            <Calendar size={18} /> Add to calendar
          </a>
        )}
        {["declined", "expired", "cancelled"].includes(view.status) && (
          <Link href={`/book?subject=${view.subjectSlug}`} className="btn btn-primary btn-lg">
            Pick another time <ArrowRight size={18} />
          </Link>
        )}
      </div>

      <BookingActions
        token={view.token}
        cancel={view.cancel}
        status={view.status}
        canSimulatePayment={view.canSimulatePayment}
      />

      <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
        Questions or a problem? Email{" "}
        <a className="link" href={`mailto:${site.contactEmail}`}>
          {site.contactEmail}
        </a>{" "}
        or{" "}
        <Link className="link" href="/contact#report">
          report a problem
        </Link>
        . Keep this page&apos;s link private: anyone with it can manage this booking.
      </p>
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 px-5 py-4">
      <span className="mt-0.5 text-accent-text">{icon}</span>
      <div className="min-w-0">
        <dt className="text-sm text-muted">{label}</dt>
        <dd className="mt-0.5 font-medium">{children}</dd>
      </div>
    </div>
  );
}
