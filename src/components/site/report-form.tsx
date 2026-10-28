"use client";

import { useState } from "react";
import { Check, Spinner } from "@/components/icons";

const TOPICS = [
  { value: "booking", label: "Booking" },
  { value: "payment", label: "Payment" },
  { value: "session", label: "A session" },
  { value: "safety", label: "Safety concern" },
  { value: "website", label: "The website" },
  { value: "other", label: "Something else" },
];

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

export function ReportForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus({ kind: "sending" });
    setErrors({});
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic: form.get("topic"),
          message: form.get("message"),
          name: form.get("name"),
          email: form.get("email"),
          website: form.get("website"),
          page: window.location.pathname,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrors(json.fields ?? {});
        setStatus({ kind: "error", message: json.error ?? "Something went wrong." });
        return;
      }
      setStatus({ kind: "sent" });
    } catch {
      setStatus({ kind: "error", message: "Couldn't reach the server. Check your connection and try again." });
    }
  }

  if (status.kind === "sent") {
    return (
      <div className="swap-in card flex items-start gap-4 p-6" role="status">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-success-soft text-success">
          <Check size={20} />
        </span>
        <div>
          <p className="font-semibold">Thanks. All four founders have been notified.</p>
          <p className="mt-1 text-ink-2">If you left an email, we&apos;ll get back to you. If it&apos;s urgent, email us directly too.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6" noValidate>
      <div>
        <label htmlFor="topic" className="mb-1.5 block text-sm font-medium">
          What&apos;s it about?
        </label>
        <select id="topic" name="topic" className="field" defaultValue="booking">
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium">
          What happened?
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className="field min-h-32 resize-y"
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : undefined}
        />
        {errors.message && (
          <p id="message-error" className="mt-1.5 text-sm text-danger">
            {errors.message}
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="report-name" className="mb-1.5 block text-sm font-medium">
            Your name <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="report-name" name="name" autoComplete="name" className="field" />
        </div>
        <div>
          <label htmlFor="report-email" className="mb-1.5 block text-sm font-medium">
            Email for a reply <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="report-email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            className="field"
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <p className="mt-1.5 text-sm text-danger">{errors.email}</p>}
        </div>
      </div>
      {/* Honeypot: hidden from people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {status.kind === "error" && (
        <p className="rounded-[12px] bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {status.message}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={status.kind === "sending"}>
        {status.kind === "sending" ? <Spinner /> : null}
        {status.kind === "sending" ? "Sending" : "Send report"}
      </button>
    </form>
  );
}
