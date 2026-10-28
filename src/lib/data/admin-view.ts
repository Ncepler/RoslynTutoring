import "server-only";
import { cancelQuote, effectiveStatus } from "@/lib/booking/policy";
import type { Booking } from "@/lib/types";
import type { AdminData } from "./admin";

/** Everything a booking card shows. Serializable, so client actions can use it. */
export type AdminBooking = {
  id: string;
  status: Booking["status"];
  startAt: string;
  endAt: string;
  durationMinutes: number;
  requestedStarts: string[];
  subjectName: string;
  level: Booking["level"];
  testCourse: string | null;
  tutorId: string;
  tutorName: string;
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
};

export function toAdminBookings(data: AdminData, now: Date): AdminBooking[] {
  const subjects = new Map(data.subjects.map((s) => [s.id, s]));
  const tutors = new Map(data.tutors.map((t) => [t.id, t]));
  const students = new Map(data.students.map((s) => [s.id, s]));
  const tests = new Map(data.tests.map((t) => [t.id, t]));
  return data.bookings.map((b) => {
    const status = effectiveStatus(b, now);
    const student = students.get(b.studentId);
    const tutor = tutors.get(b.tutorId);
    const quote = cancelQuote({ ...b, status }, now);
    return {
      id: b.id,
      status,
      startAt: b.startAt,
      endAt: b.endAt,
      durationMinutes: b.durationMinutes,
      requestedStarts: b.requestedStarts,
      subjectName: subjects.get(b.subjectId)?.name ?? "Unknown subject",
      level: b.level,
      testCourse: b.testId ? (tests.get(b.testId)?.course ?? null) : null,
      tutorId: b.tutorId,
      tutorName: tutor ? `${tutor.firstName} ${tutor.lastName}` : "Unknown",
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
      past: new Date(b.endAt).getTime() <= now.getTime(),
    };
  });
}
