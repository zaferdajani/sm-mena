"use client";

import { MapPin, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { DeliverableLine } from "@/lib/db/schema";
import { DELIVERABLE_GROUPS, DELIVERABLES, deliverable, type DeliverableGroup } from "@/lib/deliverables";
import { cn } from "@/lib/utils";

/** Pick what's included: tap a group, tap an item, set how many and on which platform. */
export function DeliverablesPicker({ value, onChange, platforms }: { value: DeliverableLine[]; onChange: (lines: DeliverableLine[]) => void; platforms: { key: string; label: string }[] }) {
  const t = useTranslations("Deliverables");
  const [group, setGroup] = useState<DeliverableGroup>("content");
  const update = (i: number, patch: Partial<DeliverableLine>) => onChange(value.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const add = (key: string) => {
    const d = deliverable(key)!;
    onChange([...value, { key, quantity: d.unit === "item" ? 4 : 1, platform: d.platform ? platforms[0]?.key ?? null : null }]);
  };
  const platformName = (k: string | null | undefined) => platforms.find((p) => p.key === k)?.label ?? "";

  return (
    <div className="min-w-0 space-y-3" data-testid="deliverables-picker">
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]" role="tablist">
        {DELIVERABLE_GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={g === group}
            onClick={() => setGroup(g)}
            className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm", g === group ? "border-foreground bg-foreground text-background" : "hover:bg-muted")}
          >
            {t(`groups.${g}`)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DELIVERABLES.filter((d) => d.group === group).map((d) => (
          <button key={d.key} type="button" onClick={() => add(d.key)} className="flex items-center gap-1 rounded-lg border border-dashed px-2.5 py-1.5 text-sm hover:border-brand hover:bg-brand/5" data-testid={`add-${d.key}`}>
            <Plus className="size-3.5" /> {t(`items.${d.key}`)}
            {d.offline && <MapPin className="size-3 text-muted-foreground" aria-label={t("offline")} />}
          </button>
        ))}
      </div>
      {!value.length ? (
        <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {value.map((line, i) => {
            const d = deliverable(line.key);
            if (!d) return null;
            return (
              <li key={i} className="flex flex-wrap items-center gap-2 p-2.5 text-sm">
                <span className="min-w-32 flex-1 font-medium">{t(`items.${line.key}`)}</span>
                <label className="flex items-center gap-1">
                  <span className="sr-only">{t("quantity")}</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={line.quantity}
                    onChange={(e) => update(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                    className="h-8 w-16 rounded-md border bg-background px-2 text-center tabular-nums"
                    dir="ltr"
                  />
                  {d.unit !== "item" && <span className="text-xs text-muted-foreground">{t(`units.${d.unit}`, { count: line.quantity }).replace(/^\d+\s*/, "")}</span>}
                </label>
                {d.platform && (
                  <select value={line.platform ?? ""} onChange={(e) => update(i, { platform: e.target.value })} className="h-8 rounded-md border bg-background px-2" aria-label={t("platform")}>
                    {platforms.map((p) => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                  </select>
                )}
                <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label={`${t("remove")} ${t(`items.${line.key}`)} ${platformName(line.platform)}`}>
                  <X className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
