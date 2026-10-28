import type { Metadata } from "next";
import { connection } from "next/server";
import { ResolveButton } from "@/components/admin/report-row";
import { Empty, PageTitle } from "@/components/admin/ui";
import { loadAdminData, requireAdmin } from "@/lib/data/admin";
import { TOPIC_LABEL } from "@/lib/data/reports";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  await connection();
  const session = await requireAdmin();
  const data = await loadAdminData(session);
  const open = data.reports.filter((r) => !r.resolvedAt);
  const resolved = data.reports.filter((r) => r.resolvedAt);
  return (
    <>
      <PageTitle title="Reports" sub="Submissions from the Report a problem form. Every report is also emailed to all four of you." />
      <div className="space-y-3">
        {[...open, ...resolved].map((r) => (
          <article key={r.id} className={`card p-5 ${r.resolvedAt ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  r.topic === "safety" ? "bg-danger-soft text-danger" : "bg-bg-subtle text-ink-2"
                }`}
              >
                {TOPIC_LABEL[r.topic as keyof typeof TOPIC_LABEL] ?? r.topic}
              </span>
              <span className="text-sm text-muted">{formatDateTime(r.createdAt)}</span>
              <span className="text-sm text-muted">
                · {[r.name, r.email].filter(Boolean).join(", ") || "Anonymous"}
                {r.page ? ` · from ${r.page}` : ""}
              </span>
              <div className="ml-auto">
                <ResolveButton id={r.id} resolved={Boolean(r.resolvedAt)} />
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-ink-2">{r.message}</p>
            {r.email && (
              <a href={`mailto:${r.email}`} className="link mt-2 inline-block text-sm">
                Reply by email
              </a>
            )}
          </article>
        ))}
        {data.reports.length === 0 && <Empty>No reports. Good.</Empty>}
      </div>
    </>
  );
}
