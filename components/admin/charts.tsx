// Small, dependency-free charts for the admin console. One series colour
// (--chart-1, contrast-checked for light and dark), thin marks, recessive
// axes, hover/focus tooltips, and a table view for every chart.

type Fmt = (n: number) => string;

/** Columns over time (one series). Long ranges are grouped by week. */
export function ColumnChart({ title, data, fmt, tableLabels }: { title: string; data: { label: string; value: number; tip: string }[]; fmt: Fmt; tableLabels: [string, string] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = niceMax(max);
  return (
    <figure className="space-y-2">
      <figcaption className="text-sm font-medium">{title}</figcaption>
      <div className="relative h-40" dir="ltr">
        {/* recessive gridlines at 0, half and top */}
        {[1, 0.5, 0].map((f) => (
          <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-border/70" style={{ top: `${(1 - f) * 100}%` }}>
            <span className="absolute -top-2 start-0 bg-background pe-1 text-[10px] text-muted-foreground tabular-nums">{fmt(Math.round(nice * f))}</span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end gap-[2px] ps-8">
          {data.map((d, i) => (
            <div key={i} tabIndex={0} className="group relative flex h-full min-w-0 flex-1 items-end justify-center outline-none" aria-label={`${d.tip}: ${fmt(d.value)}`}>
              <div className="w-full max-w-6 rounded-t-[4px] bg-chart-1 group-hover:opacity-80 group-focus:opacity-80" style={{ height: `${(d.value / nice) * 100}%`, minHeight: d.value ? 2 : 0 }} />
              <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm group-hover:block group-focus:block">
                {d.tip}: <b className="tabular-nums">{fmt(d.value)}</b>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between ps-8 text-[10px] text-muted-foreground" dir="ltr">
        <span>{data[0]?.label}</span>
        <span>{data.at(-1)?.label}</span>
      </div>
      <TableView rows={data.map((d) => [d.tip, fmt(d.value)])} labels={tableLabels} />
    </figure>
  );
}

/** Horizontal bars with the value at the tip; optional share of the first row (funnels). */
export function BarList({ title, rows, fmt, funnel = false, empty }: { title: string; rows: { label: string; value: number; sub?: string }[]; fmt: Fmt; funnel?: boolean; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const first = rows[0]?.value || 0;
  return (
    <figure className="space-y-2">
      <figcaption className="text-sm font-medium">{title}</figcaption>
      {!rows.length && <p className="text-xs text-muted-foreground">{empty}</p>}
      <ul className="space-y-1.5">
        {rows.map((r, i) => (
          <li key={`${r.label}-${i}`} className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-2 text-xs" title={`${r.label}: ${fmt(r.value)}`}>
            <span className="truncate" dir="auto">
              {r.label}
              {r.sub && <span className="block truncate text-[11px] text-muted-foreground">{r.sub}</span>}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 rounded-e-[4px] bg-chart-1" style={{ width: `${Math.max(r.value ? 1 : 0, (r.value / max) * 85)}%` }} />
              <span className="shrink-0 tabular-nums text-muted-foreground">
                <b className="text-foreground">{fmt(r.value)}</b>
                {funnel && i > 0 && first ? ` · ${Math.round((r.value / first) * 100)}%` : ""}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function TableView({ rows, labels }: { rows: string[][]; labels: [string, string] }) {
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-muted-foreground">{labels[0]}</summary>
      <table className="mt-2 w-full text-start">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-1">{r[0]}</td>
              <td className="py-1 text-end tabular-nums">{r[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <span className="sr-only">{labels[1]}</span>
    </details>
  );
}

function niceMax(n: number) {
  const pow = 10 ** Math.floor(Math.log10(n));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= n) ?? 10;
  return step * pow;
}
