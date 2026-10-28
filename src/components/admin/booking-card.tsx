import type { AdminBooking } from "@/lib/data/admin-view";
import { formatCents } from "@/lib/money";
import { formatDateTime, formatDay, formatTime } from "@/lib/time";
import { BookingCardActions, ClaimPanel } from "./booking-card-actions";
import { StatusBadge } from "./ui";

export function BookingCard({ b, meId }: { b: AdminBooking; meId: string }) {
  const mine = b.tutorId === meId;
  const open = b.claim !== null;
  return (
    <article className="border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <StatusBadge status={b.status} past={b.past} />
        <p className="font-semibold tracking-[-0.012em]">
          {b.startAt && b.endAt
            ? `${formatDay(b.startAt)} · ${formatTime(b.startAt)} to ${formatTime(b.endAt)}`
            : `Requested ${formatDateTime(b.createdAt)}`}
        </p>
        {b.tutorName && (
          <span className={`ml-auto px-2 py-0.5 text-xs font-semibold ${mine ? "bg-ink text-bg" : "bg-bg-subtle text-ink-2"}`}>
            {mine ? "You" : b.tutorName.split(" ")[0]}
          </span>
        )}
      </div>

      <p className="mt-2 text-[0.9375rem]">
        <span className="font-medium">{b.subjectName}</span>
        {b.level === "honors" && " (Honors)"} · {b.durationMinutes} min ·{" "}
        {b.amountPaidCents > 0 ? `${formatCents(b.amountPaidCents)} paid` : formatCents(b.priceCents)}
        {b.refundedCents > 0 && ` · ${formatCents(b.refundedCents)} refunded`}
      </p>
      {b.testCourse && <p className="text-sm text-muted">Preparing for {b.testCourse}</p>}

      <details className="mt-3 text-sm">
        <summary className="flex items-center justify-between gap-3 py-1">
          <span>
            <span className="font-medium">{b.student.name}</span>, grade {b.student.grade}
          </span>
          <span className="text-muted">Contact</span>
        </summary>
        <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs text-muted">Student</dt>
            <dd>
              <a className="link block truncate" href={`mailto:${b.student.email}`}>
                {b.student.email}
              </a>
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted">Parent or guardian</dt>
            <dd>
              {b.parent.name}
              <a className="link block truncate" href={`mailto:${b.parent.email}`}>
                {b.parent.email}
              </a>
            </dd>
          </div>
        </dl>
      </details>

      {b.status === "awaiting_payment" && b.holdExpiresAt && (
        <p className="mt-2 text-sm text-muted">Held until {formatDateTime(b.holdExpiresAt)}</p>
      )}
      {b.status === "cancelled" && b.cancelledBy && <p className="mt-2 text-sm text-muted">Cancelled by {b.cancelledBy}</p>}
      {b.status !== "pending" && !b.startAt && b.requestedStarts.length > 0 && (
        <p className="mt-2 text-sm text-muted">Asked for: {b.requestedStarts.map((s) => formatDateTime(s)).join("; ")}</p>
      )}

      {open && b.claim && (
        <ClaimPanel
          id={b.id}
          options={b.claim.options.map((o) => ({ ...o, label: `${formatDay(o.start)}, ${formatTime(o.start)} to ${formatTime(o.end)}` }))}
          teaches={b.claim.teaches}
          deadline={b.claimDeadline ? formatDateTime(b.claimDeadline) : null}
        />
      )}

      {!open && ["awaiting_payment", "confirmed"].includes(b.status) && !b.past && (
        <BookingCardActions
          id={b.id}
          status={b.status}
          policyRefundCents={b.policyRefundCents}
          refundableCents={b.refundableCents}
        />
      )}
    </article>
  );
}
