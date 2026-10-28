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
    <article className="card flex h-full flex-col p-6">
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-14 shrink-0 place-items-center rounded-full bg-accent-soft text-lg font-[650] tracking-[-0.02em] text-accent-soft-ink"
        >
          {tutor.firstName[0]}
          {tutor.lastName[0]}
        </span>
        <div>
          <h3 className="t-h3">
            {tutor.firstName} {tutor.lastName}
          </h3>
          <p className="text-sm text-muted">{tutor.grade ? `${ordinal(tutor.grade)} grade · Founder` : "Founder"}</p>
        </div>
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <p className="t-label">Tutors</p>
        {teaches.length > 0 ? (
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {teaches.map((s) => (
              <li key={s.id} className="rounded-full bg-bg-subtle px-3 py-1 text-sm font-medium text-ink-2">
                {s.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Subjects coming soon.</p>
        )}
      </div>
    </article>
  );
}
