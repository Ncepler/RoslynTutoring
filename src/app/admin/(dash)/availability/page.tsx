import type { Metadata } from "next";
import { connection } from "next/server";
import { bookingRules } from "@/config/site";
import { AvailabilityEditor, ProfileForm } from "@/components/admin/availability-editor";
import { PageTitle } from "@/components/admin/ui";
import { loadAdminData, requireAdmin } from "@/lib/data/admin";
import { formatMinute } from "@/lib/time";

export const metadata: Metadata = { title: "My hours" };

export default async function AvailabilityPage() {
  await connection();
  const session = await requireAdmin();
  const data = await loadAdminData(session);
  const me = session.tutor.id;
  const mine = data.availability
    .filter((a) => a.tutorId === me)
    .map((a) => ({ weekday: a.weekday, startMinute: a.startMinute, endMinute: a.endMinute }))
    .sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute);
  const priv = data.tutorPrivate.find((p) => p.tutorId === me);
  const days = bookingRules.allowWeekends ? [1, 2, 3, 4, 5, 6, 0] : [1, 2, 3, 4, 5];
  const teaches = data.subjects.filter((s) => session.tutor.subjectIds.includes(s.id)).map((s) => s.name);

  return (
    <>
      <PageTitle
        title="My hours"
        sub={`Your weekly availability. Sessions run ${formatMinute(bookingRules.earliestStartMinute)} to ${formatMinute(bookingRules.latestEndMinute)}, New York time.`}
      />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <AvailabilityEditor
          initial={mine}
          days={days}
          earliest={bookingRules.earliestStartMinute}
          latest={bookingRules.latestEndMinute}
          step={bookingRules.slotStepMinutes}
        />
        <div className="space-y-6">
          <ProfileForm email={priv?.email ?? ""} zoomLink={priv?.zoomLink ?? ""} calendarId={priv?.calendarId ?? ""} />
          <div className="card p-5 text-sm sm:p-6">
            <p className="font-semibold">You teach</p>
            <p className="mt-1 text-ink-2">{teaches.length > 0 ? teaches.join(", ") : "No subjects yet. Add them on the Subjects page."}</p>
          </div>
        </div>
      </div>
    </>
  );
}
