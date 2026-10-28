"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cancelAction, claimAction, closeAction } from "@/app/admin/actions";
import { Spinner } from "@/components/icons";

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

type Result = { ok: boolean; message?: string };

function useRun() {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  function run(label: string, fn: () => Promise<Result>, onOk?: () => void) {
    setBusy(label);
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message ?? "Done.");
        onOk?.();
      } else toast.error(r.message ?? "Something went wrong.");
      setBusy(null);
    });
  }
  return { pending, busy, run };
}

/**
 * An open request: each of the student's preferred times, with a Claim button
 * for the ones this founder can take. First to claim wins.
 */
export function ClaimPanel({
  id,
  options,
  teaches,
  deadline,
}: {
  id: string;
  options: { start: string; label: string; claimable: boolean; reason: string | null; outsideHours: boolean }[];
  teaches: boolean;
  deadline: string | null;
}) {
  const { pending, busy, run } = useRun();
  const [confirmClose, setConfirmClose] = useState(false);
  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">The student&apos;s times, in order</p>
        {deadline && <p className="text-xs text-muted">Expires {deadline} if nobody claims it</p>}
      </div>
      {!teaches && (
        <p className="mb-2 bg-warn-soft px-3 py-2 text-sm text-warn">This isn&apos;t one of your listed subjects.</p>
      )}
      <ol className="divide-y divide-line border-y border-line">
        {options.map((o, i) => (
          <li key={o.start} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
            <span className="tabular w-5 text-sm font-semibold text-muted">{i + 1}</span>
            <span className="min-w-0 flex-1 text-sm">
              {o.label}
              {o.outsideHours && <span className="ml-2 text-xs text-muted">outside your usual hours</span>}
            </span>
            {o.claimable ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={pending}
                onClick={() => run(o.start, () => claimAction(id, o.start))}
              >
                {busy === o.start && <Spinner size={15} />}
                Claim
              </button>
            ) : (
              <span className="text-xs text-muted">{o.reason}</span>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-3">
        {!confirmClose ? (
          <button type="button" className="text-sm font-medium text-muted hover:text-ink" onClick={() => setConfirmClose(true)}>
            Nobody can take it…
          </button>
        ) : (
          <div className="swap-in flex flex-wrap items-center gap-2 bg-bg-subtle p-3 text-sm">
            <span className="flex-1">Close it and tell the student none of these times work?</span>
            <button type="button" className="btn btn-danger btn-sm" disabled={pending} onClick={() => run("close", () => closeAction(id))}>
              {busy === "close" && <Spinner size={15} />}
              Close request
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmClose(false)}>
              Keep open
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function BookingCardActions({
  id,
  status,
  policyRefundCents,
  refundableCents,
}: {
  id: string;
  status: string;
  policyRefundCents: number | null;
  refundableCents: number;
}) {
  const { pending, busy, run } = useRun();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refund, setRefund] = useState<"policy" | "full" | "none">("policy");
  const [reason, setReason] = useState("");

  return (
    <div className="mt-4 border-t border-line pt-4">
      {!cancelOpen && (
        <button type="button" className="text-sm font-medium text-danger" onClick={() => setCancelOpen(true)}>
          Cancel {status === "confirmed" ? "session" : "booking"}…
        </button>
      )}

      {cancelOpen && (
        <div className="swap-in space-y-3 bg-bg-subtle p-4">
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
              onClick={() =>
                run("cancel", () => cancelAction({ bookingId: id, refund, reason: reason || undefined }), () => setCancelOpen(false))
              }
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
