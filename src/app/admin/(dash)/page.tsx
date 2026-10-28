import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { payout } from "@/config/site";
import { BookingCard } from "@/components/admin/booking-card";
import { MoneyPanel } from "@/components/admin/money-panel";
import { Empty, LinkTabs, PageTitle, Panel } from "@/components/admin/ui";
import { loadAdminData, requireAdmin } from "@/lib/data/admin";
import { toAdminBookings } from "@/lib/data/admin-view";
import { periodFor, summarizeMoney, type PeriodKind } from "@/lib/money";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage(props: PageProps<"/admin">) {
  await connection();
  const sp = await props.searchParams;
  const kind: PeriodKind = sp.period === "week" || sp.period === "all" || sp.period === "month" ? sp.period : payout.period;
  const view = sp.view === "mine" ? "mine" : "all";

  const session = await requireAdmin();
  const data = await loadAdminData(session);
  const now = new Date();
  const period = periodFor(kind, now);
  const summary = summarizeMoney({
    bookings: data.bookings,
    tutors: data.tutors.map((t) => ({ id: t.id, name: `${t.firstName} ${t.lastName}`, active: t.active })),
    period,
  });

  const me = session.tutor.id;
  const all = toAdminBookings(data, now).filter((b) => view === "all" || b.tutorId === me);
  const byStart = (a: { startAt: string }, b: { startAt: string }) => a.startAt.localeCompare(b.startAt);
  const pending = all.filter((b) => b.status === "pending").sort(byStart);
  const unpaid = all.filter((b) => b.status === "awaiting_payment").sort(byStart);
  const upcoming = all.filter((b) => b.status === "confirmed" && !b.past).sort(byStart);
  const past = all
    .filter((b) => b.status === "confirmed" && b.past)
    .sort((a, b) => b.startAt.localeCompare(a.startAt))
    .slice(0, 8);

  const href = (p: Record<string, string>) => {
    const q = new URLSearchParams({ period: kind, view, ...p });
    return `/admin?${q.toString()}`;
  };

  return (
    <>
      <PageTitle
        title={`Hi, ${session.tutor.firstName}`}
        sub={
          pending.length > 0
            ? `${pending.length} request${pending.length > 1 ? "s" : ""} waiting for a response.`
            : "No requests waiting for a response."
        }
        action={
          <LinkTabs
            label="Whose bookings"
            current={view}
            items={[
              { value: "all", label: "Everyone", href: href({ view: "all" }) },
              { value: "mine", label: "Mine", href: href({ view: "mine" }) },
            ]}
          />
        }
      />

      <MoneyPanel summary={summary} period={period} meId={me} hrefFor={(k) => href({ period: k })} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Needs a response" sub="Accept or decline. Payment is requested only after you accept." className="lg:col-span-2">
          {pending.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {pending.map((b) => (
                <BookingCard key={b.id} b={b} meId={me} />
              ))}
            </div>
          ) : (
            <Empty>You&apos;re all caught up.</Empty>
          )}
        </Panel>

        <Panel title="Waiting on payment" sub="Accepted. The slot is held until it's paid or the hold runs out.">
          <div className="space-y-3">
            {unpaid.length > 0 ? unpaid.map((b) => <BookingCard key={b.id} b={b} meId={me} />) : <Empty>Nothing waiting on payment.</Empty>}
          </div>
        </Panel>

        <Panel title="Upcoming" sub="Paid and confirmed.">
          <div className="space-y-3">
            {upcoming.length > 0 ? upcoming.map((b) => <BookingCard key={b.id} b={b} meId={me} />) : <Empty>No confirmed sessions coming up.</Empty>}
          </div>
        </Panel>

        <Panel
          title="Recent sessions"
          className="lg:col-span-2"
          action={
            <Link href="/admin/bookings" className="link text-sm font-medium">
              All bookings
            </Link>
          }
        >
          {past.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {past.map((b) => (
                <BookingCard key={b.id} b={b} meId={me} />
              ))}
            </div>
          ) : (
            <Empty>No sessions yet.</Empty>
          )}
        </Panel>
      </div>
    </>
  );
}
