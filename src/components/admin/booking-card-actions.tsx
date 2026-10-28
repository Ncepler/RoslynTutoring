"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { acceptAction, cancelAction, declineAction } from "@/app/admin/actions";
import { Spinner } from "@/components/icons";

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

type Result = { ok: boolean; message?: string };

export function BookingCardActions({
  id,
  status,
  mine,
  tutorFirst,
  policyRefundCents,
  refundableCents,
}: {
  id: string;
  status: string;
  mine: boolean;
  tutorFirst: string;
  policyRefundCents: number | null;
  refundableCents: number;
}) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refund, setRefund] = useState<"policy" | "full" | "none">("policy");
  const [reason, setReason] = useState("");

  function run(label: string, fn: () => Promise<Result>) {
    setBusy(label);
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(r.message ?? "Done.");
      else toast.error(r.message ?? "Something went wrong.");
      setBusy(null);
      if (r.ok) setCancelOpen(false);
    });
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      {status === "pending" && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => run("accept", () => acceptAction(id))}>
            {busy === "accept" && <Spinner size={15} />}
            Accept
          </button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run("decline", () => declineAction(id))}>
            {busy === "decline" && <Spinner size={15} />}
            Decline
          </button>
          {!mine && <span className="text-sm text-muted">Assigned to {tutorFirst}. Respond on their behalf only if you&apos;ve checked with them.</span>}
        </div>
      )}

      {status !== "pending" && !cancelOpen && (
        <button type="button" className="text-sm font-medium text-danger" onClick={() => setCancelOpen(true)}>
          Cancel booking…
        </button>
      )}

      {status !== "pending" && cancelOpen && (
        <div className="swap-in space-y-3 rounded-[14px] bg-bg-subtle p-4">
          <p className="text-sm font-semibold">Cancel this booking?</p>
          {refundableCents > 0 ? (
            <fieldset className="space-y-1.5 text-sm">
              <legend className="sr-only">Refund</legend>
              {[
                {
                  v: "policy" as const,
                  l: `Follow the policy (${policyRefundCents && policyRefundCents > 0 ? `refund ${dollars(policyRefundCents)}` : "no refund, it's within 12 hours"})`,
                },
                { v: "full" as const, l: `Refund in full (${dollars(refundableCents)})` },
                { v: "none" as const, l: "No refund" },
              ].map((o) => (
                <label key={o.v} className="flex items-center gap-2">
                  <input type="radio" name={`refund-${id}`} checked={refund === o.v} onChange={() => setRefund(o.v)} className="accent-[var(--accent)]" />
                  {o.l}
                </label>
              ))}
            </fieldset>
          ) : (
            <p className="text-sm text-muted">Nothing has been paid, so there&apos;s nothing to refund. The payment link will be closed.</p>
          )}
          <input
            className="field"
            placeholder="Reason (optional, for our records)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={pending}
              onClick={() => run("cancel", () => cancelAction({ bookingId: id, refund, reason: reason || undefined }))}
            >
              {busy === "cancel" && <Spinner size={15} />}
              Cancel booking
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCancelOpen(false)}>
              Keep it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
