"use client";

import { ChevronDown, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { serviceOptions } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * The services a business owner picks for a request, by category instead of one wall of 29 chips: each
 * category folds, the first (social media) and any holding a chosen service start open, a closed category
 * shows how many it holds, and the chosen services stay in view above the list with one tap to drop one.
 * Submits as repeated `services` fields, like the flat chips did, so the action and matching are untouched.
 */
export function ServiceGroups({ defaultValues = [], max = 6 }: { defaultValues?: string[]; max?: number }) {
  const locale = useLocale();
  const t = useTranslations("Requests.serviceGroups");
  const groups = serviceOptions(locale);
  const labelOf = new Map<string, string>(groups.flatMap((g) => g.services.map((s) => [s.key, s.label])));
  const [selected, setSelected] = useState<string[]>(defaultValues.filter((k) => labelOf.has(k)));
  const toggle = (key: string) => setSelected((list) => (list.includes(key) ? list.filter((k) => k !== key) : list.length < max ? [...list, key] : list));
  const full = selected.length >= max;
  return (
    <div className="grid gap-2" data-testid="service-groups">
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t("chosen")} data-testid="chosen-services">
          {selected.map((key) => (
            <li key={key}>
              <button type="button" onClick={() => toggle(key)} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground" aria-label={t("remove", { service: labelOf.get(key) ?? key })}>
                {labelOf.get(key)}
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">{full ? t("max", { count: max }) : t("hint", { count: max })}</p>
      {groups.map((g, i) => {
        const inGroup = g.services.filter((s) => selected.includes(s.key)).length;
        return (
          <details key={g.key} open={i === 0 || inGroup > 0} className="group rounded-xl border" data-testid={`service-group-${g.key}`}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <span>
                {g.label}
                {inGroup > 0 && <span className="ms-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground" data-testid="group-count">{inGroup}</span>}
                {inGroup === 0 && <span className="ms-2 text-xs font-normal text-muted-foreground">{t("count", { count: g.services.length })}</span>}
              </span>
              <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="flex flex-wrap gap-2 border-t px-3 py-3">
              {g.services.map((s) => {
                const on = selected.includes(s.key);
                return (
                  <label key={s.key} className={cn("cursor-pointer", !on && full && "cursor-not-allowed opacity-50")}>
                    <input type="checkbox" name="services" value={s.key} checked={on} disabled={!on && full} onChange={() => toggle(s.key)} className="peer sr-only" />
                    <span className="inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-sm transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                      {s.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
