"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Spinner } from "@/components/icons";

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/** Cancel (with a clear second step), plus the dev-only payment shortcut. */
export function BookingActions({
  token,
  status,
  cancel,
  canSimulatePayment,
}: {
  token: string;
  status: string;
  cancel: { refundCents: number; late: boolean } | null;
  canSimulatePayment: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function post(url: string, body?: unknown) {
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) {
      setError(json.message ?? json.error ?? "Something went wrong.");
      return;
    }
    setConfirming(false);
    startTransition(() => router.refresh());
  }

  const consequence = !cancel
    ? ""
    : status === "confirmed"
      ? cancel.refundCents > 0
        ? `You'll get a full refund of ${dollars(cancel.refundCents)}.`
        : "It's too close to the session for a refund."
      : "You haven't paid, so there's nothing to refund.";

  return (
    <div className="mt-8 space-y-4">
      {canSimulatePayment && (
        <div className="border border-dashed border-line-strong p-4 text-sm">
          <p className="text-muted">Local testing: Stripe isn&apos;t set up, so you can mark this as paid.</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm mt-3"
            disabled={pending}
            onClick={() => post("/api/dev/pay", { token })}
          >
            Mark as paid (dev only)
          </button>
        </div>
      )}

      {cancel && !confirming && (
        <button type="button" className="link text-sm font-medium text-danger" onClick={() => setConfirming(true)}>
          {status === "confirmed" ? "Cancel this session" : "Cancel this request"}
        </button>
      )}

      {cancel && confirming && (
        <div className="swap-in border border-line bg-bg-subtle p-5" role="alertdialog" aria-labelledby="cancel-title">
          <p id="cancel-title" className="font-semibold">
            Cancel this {status === "confirmed" ? "session" : "request"}?
          </p>
          <p className="mt-1 text-sm text-ink-2">{consequence} This can&apos;t be undone.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={pending}
              onClick={() => post(`/api/bookings/${token}/cancel`)}
            >
              {pending && <Spinner size={16} />}
              Yes, cancel
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
              Keep it
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** After Stripe redirects back, the webhook may take a second. Refresh a few times. */
export function PaidPoller() {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const id = window.setInterval(() => {
      tries++;
      router.refresh();
      if (tries >= 6) window.clearInterval(id);
    }, 2500);
    return () => window.clearInterval(id);
  }, [router]);
  return null;
}
