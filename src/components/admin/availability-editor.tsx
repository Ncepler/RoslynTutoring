"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveAvailability, saveProfile } from "@/app/admin/actions";
import { Close, Plus, Spinner } from "@/components/icons";

type Window = { weekday: number; startMinute: number; endMinute: number };

const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function label(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(mm).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function AvailabilityEditor({
  initial,
  days,
  earliest,
  latest,
  step,
}: {
  initial: Window[];
  days: number[];
  earliest: number;
  latest: number;
  step: number;
}) {
  const [windows, setWindows] = useState<Window[]>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [pending, start] = useTransition();
  const options = useMemo(() => {
    const out: number[] = [];
    for (let m = earliest; m <= latest; m += step) out.push(m);
    return out;
  }, [earliest, latest, step]);

  const dirty = JSON.stringify(windows) !== saved;
  const totalHours = windows.reduce((sum, w) => sum + Math.max(0, w.endMinute - w.startMinute), 0) / 60;

  function update(i: number, patch: Partial<Window>) {
    setWindows((ws) => ws.map((w, j) => (j === i ? { ...w, ...patch } : w)));
  }

  function add(weekday: number) {
    const sameDay = windows.filter((w) => w.weekday === weekday);
    const after = sameDay.length ? Math.max(...sameDay.map((w) => w.endMinute)) : earliest;
    const startMinute = Math.min(after, latest - 60);
    setWindows((ws) => [...ws, { weekday, startMinute, endMinute: Math.min(startMinute + 120, latest) }]);
  }

  function save() {
    const bad = windows.find((w) => w.endMinute <= w.startMinute);
    if (bad) {
      toast.error(`${DAY[bad.weekday]}: each window has to end after it starts.`);
      return;
    }
    start(async () => {
      const r = await saveAvailability(windows);
      if (r.ok) {
        setSaved(JSON.stringify(windows));
        toast.success(r.message ?? "Saved.");
      } else toast.error(r.message);
    });
  }

  return (
    <div className="card p-0">
      <div className="divide-y divide-line">
        {days.map((d) => {
          const list = windows.map((w, i) => ({ w, i })).filter(({ w }) => w.weekday === d);
          return (
            <div key={d} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:px-6">
              <p className="w-28 shrink-0 pt-2 font-semibold">{DAY[d]}</p>
              <div className="flex-1 space-y-2">
                {list.length === 0 && <p className="pt-2 text-sm text-muted">Not available</p>}
                {list.map(({ w, i }) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      aria-label={`${DAY[d]} start`}
                      className="field min-h-10 w-auto py-1.5"
                      value={w.startMinute}
                      onChange={(e) => update(i, { startMinute: Number(e.target.value) })}
                    >
                      {options.slice(0, -1).map((m) => (
                        <option key={m} value={m}>
                          {label(m)}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-muted">to</span>
                    <select
                      aria-label={`${DAY[d]} end`}
                      className="field min-h-10 w-auto py-1.5"
                      value={w.endMinute}
                      aria-invalid={w.endMinute <= w.startMinute}
                      onChange={(e) => update(i, { endMinute: Number(e.target.value) })}
                    >
                      {options.slice(1).map((m) => (
                        <option key={m} value={m}>
                          {label(m)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="grid size-9 place-items-center text-muted hover:bg-bg-subtle active:scale-95"
                      onClick={() => setWindows((ws) => ws.filter((_, j) => j !== i))}
                      aria-label={`Remove ${DAY[d]} ${label(w.startMinute)} window`}
                    >
                      <Close size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-ghost btn-sm self-start text-accent-text" onClick={() => add(d)}>
                <Plus size={16} /> Add hours
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
        <p className="text-sm text-muted">
          {totalHours.toFixed(1)} hours a week · Students only ever see open times, never whose they are.
        </p>
        <button type="button" className="btn btn-primary" disabled={!dirty || pending} onClick={save}>
          {pending && <Spinner />}
          {dirty ? "Save hours" : "Saved"}
        </button>
      </div>
    </div>
  );
}

export function ProfileForm({
  email,
  zoomLink,
  calendarId,
}: {
  email: string;
  zoomLink: string;
  calendarId: string;
}) {
  const [zoom, setZoom] = useState(zoomLink);
  const [cal, setCal] = useState(calendarId);
  const [pending, start] = useTransition();
  return (
    <form
      className="card space-y-4 p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveProfile({ zoomLink: zoom.trim(), calendarId: cal.trim() });
          if (r.ok) toast.success(r.message ?? "Saved.");
          else toast.error(r.message);
        });
      }}
    >
      <div>
        <p className="text-sm text-muted">Signed in as</p>
        <p className="font-medium">{email}</p>
      </div>
      <div>
        <label htmlFor="zoom" className="mb-1.5 block text-sm font-medium">
          Your Zoom link
        </label>
        <input id="zoom" className="field" inputMode="url" autoCapitalize="none" placeholder="https://zoom.us/j/…" value={zoom} onChange={(e) => setZoom(e.target.value)} />
        <p className="mt-1.5 text-sm text-muted">Goes in every confirmation, reminder and calendar event for your sessions.</p>
      </div>
      <div>
        <label htmlFor="cal" className="mb-1.5 block text-sm font-medium">
          Google Calendar ID <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id="cal" className="field" autoCapitalize="none" placeholder="you@gmail.com" value={cal} onChange={(e) => setCal(e.target.value)} />
        <p className="mt-1.5 text-sm text-muted">
          Share your calendar with the site&apos;s service account (&ldquo;Make changes to events&rdquo;) and paste its ID here
          (usually your Gmail address). Paid sessions are then added automatically.
        </p>
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending && <Spinner />}
        Save profile
      </button>
    </form>
  );
}
