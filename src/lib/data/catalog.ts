import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { isPreview } from "@/lib/env";
import { previewSubjects, previewTests, previewTutors } from "@/lib/preview/data";
import { createPublicClient } from "@/lib/supabase/service";
import { localDate } from "@/lib/time";
import type { Subject, TestEvent, Tutor } from "@/lib/types";
import { TUTOR_SELECT, toSubject, toTest, toTutor, type SubjectRow, type TestRow, type TutorRow } from "./rows";

/** Cache tag for everything on the public site that admins can edit. */
export const CATALOG_TAG = "catalog";

export type Catalog = {
  subjects: Subject[];
  tutors: Tutor[];
  /** Upcoming tests, soonest first. */
  tests: TestEvent[];
  /** Local date the catalog was built for, YYYY-MM-DD. */
  today: string;
  preview: boolean;
};

/**
 * Public, non-sensitive data for the marketing pages and the booking form.
 * Read with the anonymous key, so RLS limits it to public columns. Cached and
 * refreshed when an admin edits subjects, tutors or tests.
 */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  const now = new Date();
  const today = localDate(now);

  if (isPreview) {
    return {
      subjects: previewSubjects,
      tutors: previewTutors,
      tests: previewTests(now),
      today,
      preview: true,
    };
  }

  const db = createPublicClient();
  const [subjects, tutors, tests] = await Promise.all([
    db.from("subjects").select("id, slug, name, has_honors, active, sort_order").eq("active", true).order("sort_order"),
    db.from("tutors").select(TUTOR_SELECT).eq("active", true).order("sort_order"),
    db
      .from("tests")
      .select("id, subject_id, course, level, test_date")
      .gte("test_date", today)
      .order("test_date")
      .limit(24),
  ]);
  for (const r of [subjects, tutors, tests]) if (r.error) throw r.error;

  return {
    subjects: (subjects.data as SubjectRow[]).map(toSubject),
    tutors: (tutors.data as TutorRow[]).map(toTutor),
    tests: (tests.data as TestRow[]).map(toTest),
    today,
    preview: false,
  };
}

/** Subjects at least one active tutor teaches. */
export function teachableSubjectIds(catalog: Pick<Catalog, "tutors">): Set<string> {
  return new Set(catalog.tutors.filter((t) => t.active).flatMap((t) => t.subjectIds));
}
