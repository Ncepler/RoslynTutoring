import type { Subject, Tutor } from "@/lib/types";

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

/** Name, grade and subjects. No photos, no availability, by design. */
export function TutorCard({ tutor, subjects }: { tutor: Tutor; subjects: Subject[] }) {
  const teaches = subjects.filter((s) => tutor.subjectIds.includes(s.id));
  return (
    <article className="border-t border-line py-6">
      <h3 className="t-h3 text-[1.5rem]">
        {tutor.firstName} {tutor.lastName}
      </h3>
      <p className="mt-1 text-sm text-muted">{tutor.grade ? `${ordinal(tutor.grade)} grade · Founder` : "Founder"}</p>
      <p className="mt-4 text-ink-2">
        {teaches.length > 0 ? teaches.map((s) => s.name).join(", ") : <span className="text-muted">Subjects coming soon</span>}
      </p>
    </article>
  );
}
