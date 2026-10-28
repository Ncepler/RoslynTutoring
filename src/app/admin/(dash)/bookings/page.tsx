import type { Metadata } from "next";
import { connection } from "next/server";
import { BookingCard } from "@/components/admin/booking-card";
import { Empty, LinkTabs, PageTitle } from "@/components/admin/ui";
import { STATUS_LABEL } from "@/lib/booking/policy";
import { loadAdminData, requireAdmin } from "@/lib/data/admin";
import { toAdminBookings, whenOf } from "@/lib/data/admin-view";
import type { BookingStatus } from "@/lib/types";

// Claim and cancel actions run here: Stripe, calendar and emails.
export const maxDuration = 60;

export const metadata: Metadata = { title: "Bookings" };

const FILTERS: { value: string; label: string; match: (s: BookingStatus, past: boolean) => boolean }[] = [
  { value: "active", label: "Active", match: (s, past) => ["pending", "awaiting_payment"].includes(s) || (s === "confirmed" && !past) },
  { value: "past", label: "Done", match: (s, past) => s === "confirmed" && past },
  { value: "closed", label: "Closed", match: (s) => ["declined", "expired", "cancelled"].includes(s) },
  { value: "all", label: "All", match: () => true },
];

export default async function BookingsPage(props: PageProps<"/admin/bookings">) {
  await connection();
  const sp = await props.searchParams;
  const filter = FILTERS.find((f) => f.value === sp.status) ?? FILTERS[0];
  const tutor = typeof sp.tutor === "string" ? sp.tutor : "all";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";

  const session = await requireAdmin();
  const data = await loadAdminData(session);
  const now = new Date();
  const rows = toAdminBookings(data, now, session.tutor.id)
    .filter((b) => filter.match(b.status, b.past))
    .filter((b) => tutor === "all" || (tutor === "open" ? b.tutorId === null : b.tutorId === tutor))
    .filter((b) => !q || `${b.student.name} ${b.student.email} ${b.parent.name} ${b.parent.email} ${b.subjectName}`.toLowerCase().includes(q))
    .sort((a, b) => (filter.value === "active" ? whenOf(a).localeCompare(whenOf(b)) : whenOf(b).localeCompare(whenOf(a))));

  const href = (p: Record<string, string>) => `/admin/bookings?${new URLSearchParams({ status: filter.value, tutor, ...(q ? { q } : {}), ...p })}`;

  return (
    <>
      <PageTitle title="All bookings" sub="Every request across all tutors, with student and parent contact details." />
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <LinkTabs label="Status" current={filter.value} items={FILTERS.map((f) => ({ value: f.value, label: f.label, href: href({ status: f.value }) }))} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <LinkTabs
            label="Tutor"
            current={tutor}
            items={[
              { value: "all", label: "Everyone", href: href({ tutor: "all" }) },
              { value: "open", label: "Unclaimed", href: href({ tutor: "open" }) },
              ...data.tutors.map((t) => ({ value: t.id, label: t.firstName, href: href({ tutor: t.id }) })),
            ]}
          />
          <form action="/admin/bookings" className="flex gap-2">
            <input type="hidden" name="status" value={filter.value} />
            <input type="hidden" name="tutor" value={tutor} />
            <input name="q" defaultValue={q} placeholder="Search name or email" className="field min-h-10 py-2" aria-label="Search bookings" />
          </form>
        </div>
      </div>
      <p className="mb-3 text-sm text-muted">
        {rows.length} {rows.length === 1 ? "booking" : "bookings"} · {filter.label}
        {filter.value === "closed" ? ` (${["declined", "expired", "cancelled"].map((s) => STATUS_LABEL[s as BookingStatus].toLowerCase()).join(", ")})` : ""}
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((b) => (
          <BookingCard key={b.id} b={b} meId={session.tutor.id} />
        ))}
      </div>
      {rows.length === 0 && <Empty>No bookings match.</Empty>}
    </>
  );
}
