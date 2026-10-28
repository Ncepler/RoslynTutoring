import type { Metadata } from "next";
import { connection } from "next/server";
import { TestForm, TestList } from "@/components/admin/tests-manager";
import { Empty, PageTitle, Panel } from "@/components/admin/ui";
import { loadAdminData, requireAdmin } from "@/lib/data/admin";
import { addDays, daysBetween, formatLocalDate, localDate, relativeDays } from "@/lib/time";

export const metadata: Metadata = { title: "Tests" };

export default async function TestsPage() {
  await connection();
  const session = await requireAdmin();
  const data = await loadAdminData(session);
  const today = localDate(new Date());
  const subjects = new Map(data.subjects.map((s) => [s.id, s.name]));
  const toRow = (t: (typeof data.tests)[number]) => ({
    id: t.id,
    course: t.course,
    subjectName: subjects.get(t.subjectId) ?? "",
    level: t.level,
    dateLabel: formatLocalDate(t.testDate),
    when: relativeDays(daysBetween(today, t.testDate)),
    past: t.testDate < today,
  });
  const upcoming = data.tests.filter((t) => t.testDate >= today).map(toRow);
  const recent = data.tests
    .filter((t) => t.testDate < today && t.testDate >= addDays(today, -30))
    .reverse()
    .map(toRow);

  return (
    <>
      <PageTitle
        title="Test schedule"
        sub="Tests you add here show on the homepage with a Book a review button, soonest first. Past tests drop off on their own."
      />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Panel title="Upcoming" sub={`${upcoming.length} on the homepage`}>
            {upcoming.length > 0 ? <TestList rows={upcoming} /> : <Empty>No upcoming tests. Add the next one you know about.</Empty>}
          </Panel>
          {recent.length > 0 && (
            <Panel title="Last 30 days">
              <TestList rows={recent} />
            </Panel>
          )}
        </div>
        <TestForm subjects={data.subjects.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }))} today={today} />
      </div>
    </>
  );
}
