/** Database row shapes (snake_case) and their mappers to domain types. */

import type {
  AvailabilityWindow,
  Booking,
  Report,
  Student,
  Subject,
  TestEvent,
  Tutor,
  TutorPrivate,
} from "@/lib/types";

export type SubjectRow = {
  id: string;
  slug: string;
  name: string;
  has_honors: boolean;
  active: boolean;
  sort_order: number;
};

export type TutorRow = {
  id: string;
  first_name: string;
  last_name: string;
  grade: number | null;
  active: boolean;
  sort_order: number;
  tutor_subjects?: { subject_id: string }[];
};

export type TutorPrivateRow = {
  tutor_id: string;
  email: string;
  zoom_link: string | null;
  calendar_id: string | null;
};

export type AvailabilityRow = {
  id: string;
  tutor_id: string;
  weekday: number;
  start_minute: number;
  end_minute: number;
};

export type TestRow = {
  id: string;
  subject_id: string;
  course: string;
  level: "regular" | "honors" | null;
  test_date: string;
};

export type StudentRow = {
  id: string;
  first_name: string;
  last_name: string;
  grade: number;
  email: string;
  parent_name: string;
  parent_email: string;
  created_at: string;
};

export type BookingRow = {
  id: string;
  public_token: string;
  student_id: string;
  subject_id: string;
  level: "regular" | "honors";
  test_id: string | null;
  duration_minutes: number;
  requested_starts: string[];
  start_at: string | null;
  end_at: string | null;
  tutor_id: string | null;
  claim_deadline: string | null;
  status: Booking["status"];
  price_cents: number;
  hold_expires_at: string | null;
  stripe_checkout_session_id: string | null;
  stripe_checkout_url: string | null;
  stripe_payment_intent_id: string | null;
  amount_paid_cents: number;
  fee_cents: number;
  refunded_cents: number;
  accepted_at: string | null;
  declined_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  expired_at: string | null;
  responded_by: string | null;
  cancelled_by: Booking["cancelledBy"];
  cancel_reason: string | null;
  google_event_id: string | null;
  reminder_sent_at: string | null;
  created_at: string;
};

export type ReportRow = {
  id: string;
  name: string | null;
  email: string | null;
  topic: string;
  message: string;
  page: string | null;
  resolved_at: string | null;
  created_at: string;
};

export const TUTOR_SELECT = "id, first_name, last_name, grade, active, sort_order, tutor_subjects(subject_id)";

export const toSubject = (r: SubjectRow): Subject => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  hasHonors: r.has_honors,
  active: r.active,
  sortOrder: r.sort_order,
});

export const toTutor = (r: TutorRow): Tutor => ({
  id: r.id,
  firstName: r.first_name,
  lastName: r.last_name,
  grade: r.grade,
  active: r.active,
  sortOrder: r.sort_order,
  subjectIds: (r.tutor_subjects ?? []).map((s) => s.subject_id),
});

export const toTutorPrivate = (r: TutorPrivateRow): TutorPrivate => ({
  tutorId: r.tutor_id,
  email: r.email,
  zoomLink: r.zoom_link,
  calendarId: r.calendar_id,
});

export const toAvailability = (r: AvailabilityRow): AvailabilityWindow => ({
  id: r.id,
  tutorId: r.tutor_id,
  weekday: r.weekday,
  startMinute: r.start_minute,
  endMinute: r.end_minute,
});

export const toTest = (r: TestRow): TestEvent => ({
  id: r.id,
  subjectId: r.subject_id,
  course: r.course,
  level: r.level,
  testDate: r.test_date,
});

export const toStudent = (r: StudentRow): Student => ({
  id: r.id,
  firstName: r.first_name,
  lastName: r.last_name,
  grade: r.grade,
  email: r.email,
  parentName: r.parent_name,
  parentEmail: r.parent_email,
  createdAt: r.created_at,
});

export const toBooking = (r: BookingRow): Booking => ({
  id: r.id,
  publicToken: r.public_token,
  studentId: r.student_id,
  subjectId: r.subject_id,
  level: r.level,
  testId: r.test_id,
  durationMinutes: r.duration_minutes,
  requestedStarts: r.requested_starts,
  startAt: r.start_at,
  endAt: r.end_at,
  tutorId: r.tutor_id,
  claimDeadline: r.claim_deadline,
  status: r.status,
  priceCents: r.price_cents,
  holdExpiresAt: r.hold_expires_at,
  stripeCheckoutSessionId: r.stripe_checkout_session_id,
  stripeCheckoutUrl: r.stripe_checkout_url,
  stripePaymentIntentId: r.stripe_payment_intent_id,
  amountPaidCents: r.amount_paid_cents,
  feeCents: r.fee_cents,
  refundedCents: r.refunded_cents,
  acceptedAt: r.accepted_at,
  declinedAt: r.declined_at,
  paidAt: r.paid_at,
  cancelledAt: r.cancelled_at,
  expiredAt: r.expired_at,
  respondedBy: r.responded_by,
  cancelledBy: r.cancelled_by,
  cancelReason: r.cancel_reason,
  googleEventId: r.google_event_id,
  reminderSentAt: r.reminder_sent_at,
  createdAt: r.created_at,
});

export const toReport = (r: ReportRow): Report => ({
  id: r.id,
  name: r.name,
  email: r.email,
  topic: r.topic,
  message: r.message,
  page: r.page,
  resolvedAt: r.resolved_at,
  createdAt: r.created_at,
});
