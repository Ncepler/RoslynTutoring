"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveSubject, setTeaches } from "@/app/admin/actions";
import { Check, Spinner } from "@/components/icons";

type Subject = { id: string; name: string; hasHonors: boolean; active: boolean };
type Tutor = { id: string; firstName: string; subjectIds: string[] };

export function SubjectsMatrix({ subjects, tutors }: { subjects: Subject[]; tutors: Tutor[] }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  function run(key: string, fn: () => Promise<{ ok: boolean; message?: string }>) {
    setBusy(key);
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.message);
      else if (r.message) toast.success(r.message);
      setBusy(null);
    });
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-muted">
            <th scope="col" className="px-5 py-3 font-medium">Subject</th>
            {tutors.map((t) => (
              <th key={t.id} scope="col" className="px-3 py-3 text-center font-medium">{t.firstName}</th>
            ))}
            <th scope="col" className="px-3 py-3 text-center font-medium">Honors</th>
            <th scope="col" className="px-5 py-3 text-center font-medium">On site</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {subjects.map((s) => {
            const count = tutors.filter((t) => t.subjectIds.includes(s.id)).length;
            return (
              <tr key={s.id}>
                <th scope="row" className="px-5 py-3">
                  <span className="font-semibold">{s.name}</span>
                  {count === 0 && <span className="ml-2 bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">No tutor</span>}
                </th>
                {tutors.map((t) => {
                  const on = t.subjectIds.includes(s.id);
                  const key = `${t.id}:${s.id}`;
                  return (
                    <td key={t.id} className="px-3 py-3 text-center">
                      <Toggle
                        on={on}
                        busy={busy === key}
                        disabled={pending}
                        label={`${t.firstName} teaches ${s.name}`}
                        onClick={() => run(key, () => setTeaches(t.id, s.id, !on))}
                      />
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-center">
                  <Toggle
                    on={s.hasHonors}
                    busy={busy === `h:${s.id}`}
                    disabled={pending}
                    label={`${s.name} offers honors`}
                    onClick={() => run(`h:${s.id}`, () => saveSubject({ ...s, hasHonors: !s.hasHonors }))}
                  />
                </td>
                <td className="px-5 py-3 text-center">
                  <Toggle
                    on={s.active}
                    busy={busy === `a:${s.id}`}
                    disabled={pending}
                    label={`${s.name} is shown on the site`}
                    onClick={() => run(`a:${s.id}`, () => saveSubject({ ...s, active: !s.active }))}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Toggle({ on, busy, disabled, label, onClick }: { on: boolean; busy: boolean; disabled: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-grid size-8 place-items-center border transition-[background-color,border-color,transform] duration-150 active:scale-90 ${
 on ? "border-accent bg-accent text-on-accent" : "border-line-strong bg-surface text-transparent"
      }`}
    >
      {busy ? <Spinner size={14} /> : <Check size={16} strokeWidth={2.5} />}
    </button>
  );
}

export function AddSubject() {
  const [name, setName] = useState("");
  const [hasHonors, setHasHonors] = useState(true);
  const [pending, start] = useTransition();
  return (
    <form
      className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveSubject({ name, hasHonors, active: true });
          if (r.ok) {
            toast.success(r.message ?? "Added.");
            setName("");
          } else toast.error(r.message);
        });
      }}
    >
      <div className="flex-1">
        <label htmlFor="new-subject" className="mb-1.5 block text-sm font-medium">New subject</label>
        <input id="new-subject" className="field" placeholder="Earth Science" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      </div>
      <label className="flex min-h-12 items-center gap-2 text-sm">
        <input type="checkbox" checked={hasHonors} onChange={(e) => setHasHonors(e.target.checked)} className="size-4 accent-[var(--accent)]" />
        Has honors
      </label>
      <button type="submit" className="btn btn-primary" disabled={pending || !name.trim()}>
        {pending && <Spinner />}
        Add subject
      </button>
    </form>
  );
}
