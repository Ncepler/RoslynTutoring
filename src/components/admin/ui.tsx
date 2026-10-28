import Link from "next/link";
import type { BookingStatus } from "@/lib/types";

export function PageTitle({ title, sub, action }: { title: string; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[1.875rem] leading-tight font-[650] tracking-[-0.03em]">{title}</h1>
        {sub && <p className="mt-1.5 text-ink-2">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  title,
  sub,
  action,
  children,
  className = "",
}: {
  title?: string;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-lg font-semibold tracking-[-0.015em]">{title}</h2>}
            {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">{children}</p>;
}

const BADGE: Record<BookingStatus, { label: string; className: string }> = {
  pending: { label: "Open request", className: "bg-accent-soft text-accent-soft-ink" },
  awaiting_payment: { label: "Awaiting payment", className: "bg-warn-soft text-warn" },
  confirmed: { label: "Confirmed", className: "bg-success-soft text-success" },
  declined: { label: "Closed", className: "bg-bg-subtle text-muted" },
  expired: { label: "Expired", className: "bg-bg-subtle text-muted" },
  cancelled: { label: "Cancelled", className: "bg-bg-subtle text-muted" },
};

export function StatusBadge({ status, past = false }: { status: BookingStatus; past?: boolean }) {
  const b = status === "confirmed" && past ? { label: "Done", className: "bg-bg-subtle text-ink-2" } : BADGE[status];
  return <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${b.className}`}>{b.label}</span>;
}

/** Link-based segmented control for filters kept in the URL. */
export function LinkTabs({
  items,
  current,
  label,
}: {
  items: { value: string; label: string; href: string }[];
  current: string;
  label: string;
}) {
  return (
    <nav aria-label={label} className="inline-flex flex-wrap border border-line-strong bg-surface p-1">
      {items.map((i) => (
        <Link
          key={i.value}
          href={i.href}
          scroll={false}
          aria-current={i.value === current ? "true" : undefined}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
 i.value === current ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"
          }`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <p className="t-label">{label}</p>
      <p className="tabular mt-1 text-[1.75rem] leading-none font-[650] tracking-[-0.035em]">{value}</p>
      {sub && <p className="mt-1.5 text-sm text-muted">{sub}</p>}
    </div>
  );
}
