import { formatCents, type MoneySummary, type Period } from "@/lib/money";
import { LinkTabs, Stat } from "./ui";

export function MoneyPanel({
  summary,
  period,
  meId,
  hrefFor,
}: {
  summary: MoneySummary;
  period: Period;
  meId: string;
  hrefFor: (kind: string) => string;
}) {
  const rows = summary.perTutor;
  // Shares differ by at most a cent; show the largest.
  const equalShare = summary.perTutor.find((t) => t.shareCents !== 0)?.shareCents ?? 0;

  return (
    <section className="card overflow-hidden p-0" aria-labelledby="money-title">
      <div className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 id="money-title" className="text-lg font-semibold tracking-[-0.015em]">
            Money
          </h2>
          <p className="text-sm text-muted">
            {period.label}. Sessions count in the period they happen. Net is after Stripe fees and refunds.
          </p>
        </div>
        <LinkTabs
          label="Period"
          current={period.kind}
          items={[
            { value: "week", label: "Week", href: hrefFor("week") },
            { value: "month", label: "Month", href: hrefFor("month") },
            { value: "all", label: "All time", href: hrefFor("all") },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-6 p-5 sm:p-6 md:grid-cols-4">
        <Stat label="Total earned" value={formatCents(summary.netCents)} sub={`${formatCents(summary.grossCents)} collected`} />
        <Stat label="Equal split" value={formatCents(equalShare)} sub="Each founder's share" />
        <Stat label="Sessions" value={summary.sessions} sub="Paid and not cancelled" />
        <Stat
          label="Fees and refunds"
          value={formatCents(summary.feesCents + summary.refundsCents)}
          sub={`${formatCents(summary.feesCents)} fees · ${formatCents(summary.refundsCents)} refunds`}
        />
      </div>

      <div className="overflow-x-auto border-t border-line">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead>
            <tr className="text-muted">
              <th scope="col" className="px-5 py-3 font-medium sm:px-6">Founder</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">Sessions</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">Hours</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">Brought in</th>
              <th scope="col" className="px-5 py-3 text-right font-medium sm:px-6">Equal share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((t) => (
              <tr key={t.tutorId} className={t.tutorId === meId ? "bg-accent-soft/40" : ""}>
                <th scope="row" className="px-5 py-3 font-semibold sm:px-6">
                  {t.name}
                  {t.tutorId === meId && <span className="ml-1.5 text-xs font-medium text-muted">(you)</span>}
                </th>
                <td className="tabular px-3 py-3 text-right">{t.sessions}</td>
                <td className="tabular px-3 py-3 text-right">{(t.minutes / 60).toFixed(1)}</td>
                <td className="tabular px-3 py-3 text-right">{formatCents(t.earnedCents)}</td>
                <td className="tabular px-5 py-3 text-right font-semibold sm:px-6">{formatCents(t.shareCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
