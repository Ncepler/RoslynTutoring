/** Domain types shared by the server, the admin dashboard and the pure logic. */

export type Level = "regular" | "honors";

export type BookingStatus =
  | "pending"
  | "awaiting_payment"
  | "confirmed"
  | "declined"
  | "expired"
  | "cancelled";

/** Statuses that occupy a tutor's time. Mirrors the bookings_no_overlap constraint. */
export const HOLDING_STATUSES: readonly BookingStatus[] = ["pending", "awaiting_payment", "confirmed"];

export type Subject = {
  id: string;
  slug: string;
  name: string;
  hasHonors: boolean;
  active: boolean;
  sortOrder: number;
};

export type Tutor = {
  id: string;
  firstName: string;
  lastName: string;
  grade: number | null;
  active: boolean;
  sortOrder: number;
  subjectIds: string[];
};

export type TutorPrivate = {
  tutorId: string;
  email: string;
  zoomLink: string | null;
  calendarId: string | null;
};

/** A weekly window, in minutes after local midnight. weekday 0 = Sunday. */
export type AvailabilityWindow = {
  id: string;
  tutorId: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
};

export type TestEvent = {
  id: string;
  subjectId: string;
  course: string;
  level: Level | null;
  /** Local date, YYYY-MM-DD. */
  testDate: string;
};

export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  grade: number;
  email: string;
  parentName: string;
  parentEmail: string;
  createdAt: string;
};

export type Booking = {
  id: string;
  publicToken: string;
  studentId: string;
  subjectId: string;
  level: Level;
  testId: string | null;
  durationMinutes: number;
  requestedStarts: string[];
  startAt: string;
  endAt: string;
  tutorId: string;
  status: BookingStatus;
  priceCents: number;
  holdExpiresAt: string | null;
  stripeCheckoutSessionId: string | null;
  stripeCheckoutUrl: string | null;
  stripePaymentIntentId: string | null;
  amountPaidCents: number;
  feeCents: number;
  refundedCents: number;
  acceptedAt: string | null;
  declinedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  expiredAt: string | null;
  respondedBy: string | null;
  cancelledBy: "student" | "admin" | "system" | null;
  cancelReason: string | null;
  googleEventId: string | null;
  reminderSentAt: string | null;
  createdAt: string;
};

export type Report = {
  id: string;
  name: string | null;
  email: string | null;
  topic: string;
  message: string;
  page: string | null;
  resolvedAt: string | null;
  createdAt: string;
};
