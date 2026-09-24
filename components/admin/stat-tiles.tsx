import { cn } from "@/lib/utils";

export type Tile = { label: string; value: number | string; hint?: string; tone?: "bad" | "good" };

/** Row of headline numbers. Text stays in text colours; tone only tints the border. */
export function StatTiles({ tiles, locale }: { tiles: Tile[]; locale: string }) {
  const fmt = (v: number | string) => (typeof v === "number" ? v.toLocaleString(locale === "ar" ? "ar-JO-u-nu-latn" : "en") : v);
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((tile) => (
        <div key={tile.label} className={cn("flex flex-col-reverse rounded-xl border p-3", tile.tone === "bad" && "border-destructive/40", tile.tone === "good" && "border-brand/40")}>
          <dt className="text-xs text-muted-foreground">
            {tile.label}
            {tile.hint && <span className="block text-[11px]">{tile.hint}</span>}
          </dt>
          <dd className="text-2xl font-bold tabular-nums">{fmt(tile.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
