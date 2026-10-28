/**
 * Small, dependency-free charts for the analytics page. Single series, one
 * hue (the accent), thin marks with 4px rounded data ends anchored to the
 * baseline, values in ink colors (never the series color), recessive axes.
 */

export function BarList({
  rows,
  format = (n) => String(n),
  empty = "No data yet.",
}: {
  rows: { label: string; value: number; note?: string }[];
  format?: (n: number) => string;
  empty?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0 || rows.every((r) => r.value === 0)) {
    return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  }
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="group" title={`${r.label}: ${format(r.value)}${r.note ? ` (${r.note})` : ""}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-ink">{r.label}</span>
            <span className="tabular text-ink-2">
              {format(r.value)}
              {r.note && <span className="ml-1.5 text-muted">{r.note}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-r-[4px] bg-bg-subtle">
            <div
              className="h-full rounded-r-[4px] bg-accent transition-opacity group-hover:opacity-80"
              style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value > 0 ? 4 : 0 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ColumnChart({
  columns,
  caption,
}: {
  columns: { label: string; value: number; detail: string }[];
  caption: string;
}) {
  const max = Math.max(1, ...columns.map((c) => c.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  return (
    <figure>
      <div className="relative h-44 pl-8">
        {/* Recessive gridlines and axis labels */}
        {ticks.map((t) => (
          <div key={t} className="absolute right-0 left-8 border-t border-line" style={{ bottom: `${(t / top) * 100}%` }}>
            <span className="tabular absolute -top-2 -left-8 w-6 text-right text-[0.6875rem] text-muted">{t}</span>
          </div>
        ))}
        <ol className="relative flex h-full items-end gap-[2px]">
          {columns.map((c) => (
            <li key={c.label} className="group relative flex h-full flex-1 items-end justify-center" tabIndex={0} aria-label={`${c.label}: ${c.detail}`}>
              <div
                className="w-full max-w-10 rounded-t-[4px] bg-accent transition-opacity group-hover:opacity-80 group-focus:opacity-80"
                style={{ height: `${(c.value / top) * 100}%`, minHeight: c.value > 0 ? 3 : 0 }}
              />
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 translate-y-1 rounded-[10px] bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-bg opacity-0 shadow-[var(--shadow-float)] transition-[opacity,transform] duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus:translate-y-0 group-focus:opacity-100"
              >
                <span className="font-semibold">{c.label}</span> · {c.detail}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-2 flex gap-[2px] pl-8">
        {columns.map((c) => (
          <span key={c.label} className="flex-1 truncate text-center text-[0.6875rem] text-muted">
            {c.label}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
      <details className="mt-3 text-sm">
        <summary className="text-muted">Show as table</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-muted">
              <th scope="col" className="py-1 font-medium">Week of</th>
              <th scope="col" className="py-1 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((c) => (
              <tr key={c.label} className="border-t border-line">
                <td className="py-1">{c.label}</td>
                <td className="tabular py-1">{c.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function niceTicks(max: number): number[] {
  const step = max <= 4 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : Math.ceil(max / 5 / 10) * 10;
  const out: number[] = [];
  for (let t = 0; t <= max || out.length < 2; t += step) out.push(t);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}
