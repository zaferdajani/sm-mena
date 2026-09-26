import { useTranslations } from "next-intl";
import { countryOf, type CountryCode } from "@/lib/countries";

// Tiles placed roughly where each country sits (west to east), not flipped for RTL:
// geography reads the same in every language.
const TILES: Record<CountryCode, { col: number; row: number }> = {
  jo: { col: 2, row: 1 },
  kw: { col: 4, row: 1 },
  eg: { col: 1, row: 2 },
  sa: { col: 3, row: 2 },
  bh: { col: 4, row: 2 },
  qa: { col: 5, row: 2 },
  ae: { col: 5, row: 3 },
  om: { col: 6, row: 3 },
};

/** A tile map of the served countries, shaded by how many providers registered in each. */
export function ProviderMap({ countries, locale }: { countries: { code: CountryCode; n: number }[]; locale: string }) {
  const t = useTranslations("Teaser");
  const max = Math.max(1, ...countries.map((c) => c.n));
  return (
    <div dir="ltr" className="grid grid-cols-6 gap-1.5 sm:gap-2" data-testid="teaser-map">
      {countries.map(({ code, n }) => {
        const c = countryOf(code);
        const share = n / max;
        return (
          <div
            key={code}
            dir={locale === "ar" ? "rtl" : "ltr"}
            style={{ gridColumn: TILES[code].col, gridRow: TILES[code].row }}
            className={`flex aspect-square flex-col items-center justify-center rounded-xl border p-1 text-center ${n ? "border-brand-line" : "border-dashed"}`}
            data-country={code}
          >
            <span className="sr-only">{locale === "ar" ? c.ar : c.en}</span>
            <span aria-hidden className="text-lg leading-none sm:text-2xl">{c.flag}</span>
            <span aria-hidden className="mt-0.5 line-clamp-1 text-[0.6rem] font-medium sm:text-xs">{locale === "ar" ? c.ar : c.en}</span>
            <span
              className={`mt-1 rounded-full px-1.5 text-[0.65rem] font-bold tabular-nums sm:text-sm ${n ? "text-primary-foreground" : "text-muted-foreground"}`}
              style={n ? { backgroundColor: `color-mix(in oklab, var(--primary) ${Math.round(45 + share * 55)}%, transparent)` } : undefined}
              title={n ? t("mapCount", { count: n }) : t("mapOpen")}
            >
              {n || "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Horizontal bars; lengths are relative to the largest value. */
export function ProviderBars({ rows, testId }: { rows: { key: string; label: string; flag?: string; n: number }[]; testId: string }) {
  const t = useTranslations("Teaser");
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <ul className="space-y-2" data-testid={testId}>
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[7rem_1fr_auto] items-center gap-2 text-sm">
          <span className="truncate">
            {r.flag && <span aria-hidden className="me-1">{r.flag}</span>}
            {r.label}
          </span>
          <span className="h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
            <span className="block h-full rounded-full bg-primary" style={{ inlineSize: `${r.n ? Math.max(4, (r.n / max) * 100) : 0}%` }} />
          </span>
          <span className={`min-w-8 text-end tabular-nums ${r.n ? "font-semibold" : "text-xs text-muted-foreground"}`}>{r.n || t("mapOpen")}</span>
        </li>
      ))}
    </ul>
  );
}
