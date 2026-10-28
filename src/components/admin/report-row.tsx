"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setReportResolved } from "@/app/admin/actions";

export function ResolveButton({ id, resolved }: { id: string; resolved: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={`btn btn-sm ${resolved ? "btn-ghost" : "btn-secondary"}`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await setReportResolved(id, !resolved);
          if (r.ok) toast.success(r.message ?? "Done.");
          else toast.error(r.message);
        })
      }
    >
      {resolved ? "Reopen" : "Mark resolved"}
    </button>
  );
}
