import "server-only";
import { busyFromBookings, claimOptions, type ClaimOption } from "@/lib/booking/claim";
import { cancelQuote, effectiveStatus } from "@/lib/booking/policy";
import type { Booking } from "@/lib/types";
import type { AdminData } from "./admin";

/** Everything a booking card shows. Serializable, so client actions can use it. */
export type AdminBooking = {
  id: string;
  status: Booking["status"];
  /** Null while the request is open (unclaimed). */
  startAt: string | null;
  endAt: string | null;
  durationMinutes: number;
  requestedStarts: string[];
  claimDeadline: string | null;
  subjectName: string;
  level: Booking["level"];
  testCourse: string | null;
  tutorId: string | null;
  tutorName: string | null;
  student: { name: string; grade: number; email: string };
  parent: { name: string; email: string };
  priceCents: number;
  amountPaidCents: number;
  refundedCents: number;
  holdExpiresAt: string | null;
  createdAt: string;
  cancelledBy: Booking["cancelledBy"];
  /** Refund the 12-hour policy would give right now (null if not cancellable). */
  policyRefundCents: number | null;
  refundableCents: number;
  past: boolean;
  /** For open requests: which of the student's times the viewer can claim. */
  claim: { options: ClaimOption[]; teaches: boolean } | null;
};

export function toAdminBookings(data: AdminData, now: Date, viewerId: string): AdminBooking[] {
  const subjects = new Map(data.subjects.map((s) => [s.id, s]));
  const tutors = new Map(data.tutors.map((t) => [t.id, t]));
  const students = new Map(data.students.map((s) => [s.id, s]));
  const tests = new Map(data.tests.map((t) => [t.id, t]));
  const viewer = tutors.get(viewerId);
  const busy = busyFromBookings(data.bookings, now);
  const viewerHours = data.availability.filter((a) => a.tutorId === viewerId);

  return data.bookings.map((b) => {
    const status = effectiveStatus(b, now);
    const student = students.get(b.studentId);
    const tutor = b.tutorId ? tutors.get(b.tutorId) : undefined;
    const quote = cancelQuote({ ...b, status }, now);
    const open = status === "pending" && !b.tutorId;
    return {
      id: b.id,
      status,
      startAt: b.startAt,
      endAt: b.endAt,
      durationMinutes: b.durationMinutes,
      requestedStarts: b.requestedStarts,
      claimDeadline: b.claimDeadline,
      subjectName: subjects.get(b.subjectId)?.name ?? "Unknown subject",
      level: b.level,
      testCourse: b.testId ? (tests.get(b.testId)?.course ?? null) : null,
      tutorId: b.tutorId,
      tutorName: tutor ? `${tutor.firstName} ${tutor.lastName}` : null,
      student: {
        name: student ? `${student.firstName} ${student.lastName}` : "Unknown student",
        grade: student?.grade ?? 0,
        email: student?.email ?? "",
      },
      parent: { name: student?.parentName ?? "", email: student?.parentEmail ?? "" },
      priceCents: b.priceCents,
      amountPaidCents: b.amountPaidCents,
      refundedCents: b.refundedCents,
      holdExpiresAt: b.holdExpiresAt,
      createdAt: b.createdAt,
      cancelledBy: b.cancelledBy,
      policyRefundCents: quote.allowed ? quote.refundCents : null,
      refundableCents: Math.max(0, b.amountPaidCents - b.refundedCents),
      past: b.endAt !== null && new Date(b.endAt).getTime() <= now.getTime(),
      claim: open
        ? {
            teaches: viewer?.subjectIds.includes(b.subjectId) ?? false,
            options: claimOptions({
              tutorId: viewerId,
              requestedStarts: b.requestedStarts,
              durationMinutes: b.durationMinutes,
              now,
              busy,
              availability: viewerHours,
            }),
          }
        : null,
    };
  });
}

/** Sort key: the booked time, or the student's first choice while open. */
export function whenOf(b: Pick<AdminBooking, "startAt" | "requestedStarts">): string {
  return b.startAt ?? b.requestedStarts[0] ?? "";
}
