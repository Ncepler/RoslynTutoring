import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { isPreview } from "@/lib/env";
import {
  previewAvailability,
  previewBookings,
  previewReports,
  previewStudents,
  previewSubjects,
  previewTests,
  previewTutorPrivate,
  previewTutors,
} from "@/lib/preview/data";
import { createUserClient } from "@/lib/supabase/server";
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
import {
  TUTOR_SELECT,
  toAvailability,
  toBooking,
  toReport,
  toStudent,
  toSubject,
  toTest,
  toTutor,
  toTutorPrivate,
  type AvailabilityRow,
  type BookingRow,
  type ReportRow,
  type StudentRow,
  type SubjectRow,
  type TestRow,
  type TutorPrivateRow,
  type TutorRow,
} from "./rows";

export type AdminSession =
  | { preview: true; tutor: Tutor; db: null }
  | { preview: false; tutor: Tutor; db: SupabaseClient };

/**
 * The signed-in founder, verified on the server. Redirects to the login page
 * otherwise. In preview mode (no Supabase) it returns a sample admin so the
 * dashboard can be looked at; nothing can be saved there.
 */
export const requireAdmin = cache(async function requireAdmin(): Promise<AdminSession> {
  await connection(); // always per request, even in preview mode
  if (isPreview) return { preview: true, tutor: previewTutors[0], db: null };

  const db = await createUserClient();
  const { data: claims } = await db.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/admin/login");

  const { data, error } = await db
    .from("tutors")
    .select(TUTOR_SELECT)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) redirect("/admin/login?error=not-admin");
  return { preview: false, tutor: toTutor(data as TutorRow), db };
});

export type AdminData = {
  tutors: Tutor[];
  tutorPrivate: TutorPrivate[];
  subjects: Subject[];
  availability: AvailabilityWindow[];
  tests: TestEvent[];
  students: Student[];
  bookings: Booking[];
  reports: Report[];
};

/**
 * Everything the dashboard shows, read as the signed-in admin so RLS applies.
 * At this business's scale (a few hundred bookings a year) loading it all at
 * once is simpler and faster than paging.
 */
export const loadAdminData = cache(async function loadAdminData(session: AdminSession, now = new Date()): Promise<AdminData> {
  if (session.preview) {
    return {
      tutors: previewTutors,
      tutorPrivate: previewTutorPrivate,
      subjects: previewSubjects,
      availability: previewAvailability,
      tests: previewTests(now),
      students: previewStudents,
      bookings: previewBookings(now),
      reports: previewReports(now),
    };
  }

  const db = session.db;
  const [tutors, priv, subjects, availability, tests, students, bookings, reports] = await Promise.all([
    db.from("tutors").select(TUTOR_SELECT).order("sort_order"),
    db.from("tutor_private").select("tutor_id, email, zoom_link, calendar_id"),
    db.from("subjects").select("id, slug, name, has_honors, active, sort_order").order("sort_order"),
    db.from("availability").select("id, tutor_id, weekday, start_minute, end_minute").order("start_minute"),
    db.from("tests").select("id, subject_id, course, level, test_date").order("test_date"),
    db.from("students").select("*"),
    db.from("bookings").select("*").order("start_at", { ascending: false }).limit(5000),
    db.from("reports").select("*").order("created_at", { ascending: false }).limit(200),
  ]);
  for (const r of [tutors, priv, subjects, availability, tests, students, bookings, reports]) {
    if (r.error) throw r.error;
  }

  return {
    tutors: (tutors.data as TutorRow[]).map(toTutor),
    tutorPrivate: (priv.data as TutorPrivateRow[]).map(toTutorPrivate),
    subjects: (subjects.data as SubjectRow[]).map(toSubject),
    availability: (availability.data as AvailabilityRow[]).map(toAvailability),
    tests: (tests.data as TestRow[]).map(toTest),
    students: (students.data as StudentRow[]).map(toStudent),
    bookings: (bookings.data as BookingRow[]).map(toBooking),
    reports: (reports.data as ReportRow[]).map(toReport),
  };
});
