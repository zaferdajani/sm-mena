import { cn } from "@/lib/utils";

/**
 * Single-series daily bar chart (contact clicks). Title names the series, so
 * no legend. Each bar has a hover/focus tooltip and a table view is provided.
 */
export function ClicksChart({
  data,
  title,
  tableLabel,
  dateLabel,
  valueLabel,
  locale,
}: {
  data: { date: string; clicks: number }[];
  title: string;
  tableLabel: string;
  dateLabel: string;
  valueLabel: string;
  locale: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.clicks));
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en", { day: "numeric", month: "short" });
  const label = (d: string) => fmt.format(new Date(`${d}T12:00:00Z`));
  return (
    <figure className="rounded-xl border p-4">
      <figcaption className="mb-3 flex items-baseline justify-between text-sm font-semibold">
        {title}
        <span className="text-xs font-normal text-muted-foreground">max {max}</span>
      </figcaption>
      <div className="relative h-32" dir="ltr">
        <div className="absolute inset-x-0 bottom-0 border-t border-border" />
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-border/60" />
        <div className="flex h-full items-end gap-[2px]">
          {data.map((d) => (
            <div key={d.date} tabIndex={0} className="group relative flex h-full flex-1 items-end outline-none" aria-label={`${label(d.date)}: ${d.clicks}`}>
              <div
                className={cn("w-full rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80", d.clicks === 0 && "bg-transparent")}
                style={{ height: `${(d.clicks / max) * 100}%` }}
              />
              <span className="pointer-events-none absolute bottom-full start-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] text-background shadow group-hover:block group-focus:block">
                {label(d.date)} · {d.clicks}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground" dir="ltr">
        <span>{label(data[0].date)}</span>
        <span>{label(data[data.length - 1].date)}</span>
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-muted-foreground">{tableLabel}</summary>
        <table className="mt-2 w-full text-start">
          <thead>
            <tr className="text-muted-foreground">
              <th className="py-1 text-start font-medium">{dateLabel}</th>
              <th className="py-1 text-end font-medium">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {data.filter((d) => d.clicks > 0).map((d) => (
              <tr key={d.date} className="border-t">
                <td className="py-1">{label(d.date)}</td>
                <td className="py-1 text-end tabular-nums">{d.clicks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
