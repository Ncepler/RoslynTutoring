import type { Subject, Tutor } from "@/lib/types";

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

/** Name, subjects and, on the tutors page, grade. No photos, no availability, by design. */
export function TutorCard({
  tutor,
  subjects,
  showGrade = true,
}: {
  tutor: Tutor;
  subjects: Subject[];
  showGrade?: boolean;
}) {
  const teaches = subjects.filter((s) => tutor.subjectIds.includes(s.id));
  return (
    <article className="py-4">
      <h3 className="t-h3 text-[1.375rem]">
        {tutor.firstName} {tutor.lastName}
      </h3>
      {showGrade && (
        <p className="mt-0.5 text-sm text-muted">{tutor.grade ? `${ordinal(tutor.grade)} grade · Founder` : "Founder"}</p>
      )}
      <p className="mt-2 text-ink-2">
        {teaches.length > 0 ? teaches.map((s) => s.name).join(", ") : <span className="text-muted">Subjects coming soon</span>}
      </p>
    </article>
  );
}
