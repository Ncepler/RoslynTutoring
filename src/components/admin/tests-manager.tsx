"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createTest, deleteTest } from "@/app/admin/actions";
import { Close, Spinner } from "@/components/icons";

type Row = { id: string; course: string; subjectName: string; level: string | null; dateLabel: string; when: string; past: boolean };

export function TestForm({ subjects, today }: { subjects: { id: string; name: string }[]; today: string }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [course, setCourse] = useState("");
  const [level, setLevel] = useState<"both" | "regular" | "honors">("both");
  const [date, setDate] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="card space-y-4 p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createTest({ subjectId, course, level, testDate: date });
          if (r.ok) {
            toast.success(r.message ?? "Added.");
            setCourse("");
            setDate("");
          } else toast.error(r.message);
        });
      }}
    >
      <h2 className="text-lg font-semibold tracking-[-0.015em]">Add a test</h2>
      <div>
        <label htmlFor="t-subject" className="mb-1.5 block text-sm font-medium">Subject</label>
        <select id="t-subject" className="field" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="t-course" className="mb-1.5 block text-sm font-medium">Test name</label>
        <input id="t-course" className="field" placeholder="Geometry Regents, or Unit 4 test" value={course} onChange={(e) => setCourse(e.target.value)} maxLength={120} required />
        <p className="mt-1.5 text-sm text-muted">Shown on the homepage as written.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="t-level" className="mb-1.5 block text-sm font-medium">Level</label>
          <select id="t-level" className="field" value={level} onChange={(e) => setLevel(e.target.value as typeof level)}>
            <option value="both">Both</option>
            <option value="regular">Regular</option>
            <option value="honors">Honors</option>
          </select>
        </div>
        <div>
          <label htmlFor="t-date" className="mb-1.5 block text-sm font-medium">Date</label>
          <input id="t-date" type="date" className="field" min={today} value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={pending || !course || !date}>
        {pending && <Spinner />}
        Add to homepage
      </button>
    </form>
  );
}

export function TestList({ rows }: { rows: Row[] }) {
  const [pending, start] = useTransition();
  return (
    <ul className="divide-y divide-line">
      {rows.map((t) => (
        <li key={t.id} className={`flex items-center gap-4 py-3 ${t.past ? "opacity-60" : ""}`}>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{t.course}</p>
            <p className="text-sm text-muted">
              {t.subjectName}
              {t.level ? ` · ${t.level === "honors" ? "Honors" : "Regular"}` : ""} · {t.dateLabel} · {t.when}
            </p>
          </div>
          <button
            type="button"
            className="grid size-9 place-items-center text-muted hover:bg-bg-subtle active:scale-95"
            disabled={pending}
            aria-label={`Remove ${t.course}`}
            onClick={() =>
              start(async () => {
                const r = await deleteTest(t.id);
                if (r.ok) toast.success(r.message ?? "Removed.");
                else toast.error(r.message);
              })
            }
          >
            <Close size={16} />
          </button>
        </li>
      ))}
    </ul>
  );
}
