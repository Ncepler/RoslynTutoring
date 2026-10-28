import type { Metadata } from "next";
import { connection } from "next/server";
import { payout } from "@/config/site";
import { BarList, ColumnChart } from "@/components/admin/charts";
import { LinkTabs, PageTitle, Panel, Stat } from "@/components/admin/ui";
import { computeAnalytics, rate } from "@/lib/analytics";
import { loadAdminData, requireAdmin } from "@/lib/data/admin";
import { periodFor, type PeriodKind } from "@/lib/money";
import { formatLocalDate } from "@/lib/time";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage(props: PageProps<"/admin/analytics">) {
  await connection();
  const sp = await props.searchParams;
  const kind: PeriodKind = sp.period === "week" || sp.period === "month" || sp.period === "all" ? sp.period : payout.period;
  const session = await requireAdmin();
  const data = await loadAdminData(session);
  const now = new Date();
  const period = periodFor(kind, now);
  const a = computeAnalytics({ bookings: data.bookings, tests: data.tests, period, now });
  const subjects = new Map(data.subjects.map((s) => [s.id, s.name]));
  const tutors = new Map(data.tutors.map((t) => [t.id, t.firstName]));

  return (
    <>
      <PageTitle
        title="Analytics"
        sub="From our own database only. No trackers, since most of our students are minors."
        action={
          <LinkTabs
            label="Period"
            current={kind}
            items={[
              { value: "week", label: "Week", href: "/admin/analytics?period=week" },
              { value: "month", label: "Month", href: "/admin/analytics?period=month" },
              { value: "all", label: "All time", href: "/admin/analytics?period=all" },
            ]}
          />
        }
      />

      <section className="card grid grid-cols-2 gap-6 p-5 sm:p-6 lg:grid-cols-5" aria-label="Key numbers">
        <Stat label="New students" value={a.newStudents} sub="First request this period" />
        <Stat label="Requests" value={a.requests} />
        <Stat label="Accepted" value={a.accepted} sub={`${rate(a.accepted, a.requests)} of requests`} />
        <Stat label="Paid" value={a.paid} sub={`${rate(a.paid, a.requests)} of requests · ${rate(a.paid, a.accepted)} of accepted`} />
        <Stat
          label="Repeat students"
          value={a.repeatStudents}
          sub={a.repeatRate === null ? "No paying students yet" : `${Math.round(a.repeatRate * 100)}% of paying students, all time`}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Requests per week" sub="Last 8 weeks, by the week the request came in. Hover a bar for paid sessions.">
          <ColumnChart
            caption="Booking requests per week for the last eight weeks"
            columns={a.weekly.map((w) => ({
              label: formatLocalDate(w.weekStart).replace(/^\w+, /, ""),
              value: w.requests,
              detail: `${w.requests} requests, ${w.paid} paid`,
            }))}
          />
        </Panel>

        <Panel title="Request → accepted → paid" sub={period.label}>
          <BarList
            rows={[
              { label: "Requested", value: a.requests },
              { label: "Accepted by a tutor", value: a.accepted, note: rate(a.accepted, a.requests) },
              { label: "Paid", value: a.paid, note: rate(a.paid, a.requests) },
            ]}
            empty="No requests in this period."
          />
        </Panel>

        <Panel title="Requests by subject" sub={period.label}>
          <BarList
            rows={a.bySubject.map((s) => ({
              label: subjects.get(s.subjectId) ?? "Unknown",
              value: s.requests,
              note: `${s.paid} paid`,
            }))}
            empty="No requests in this period."
          />
        </Panel>

        <Panel title="How far ahead of a test students book" sub="Requests tied to a test on the schedule, by days between the session and the test.">
          <BarList rows={a.daysBeforeTest.map((b) => ({ label: b.label, value: b.count }))} empty="No requests linked to a scheduled test yet." />
        </Panel>

        <Panel title="Tutor hours" sub={`Sessions taught, ${period.label.toLowerCase()}`} className="lg:col-span-2">
          <BarList
            rows={data.tutors
              .filter((t) => t.active)
              .map((t) => ({
                label: tutors.get(t.id) ?? "",
                value: (a.tutorMinutes.find((m) => m.tutorId === t.id)?.minutes ?? 0) / 60,
              }))}
            format={(h) => `${h.toFixed(1)} h`}
            empty="No sessions taught in this period yet."
          />
        </Panel>
      </div>
    </>
  );
}
