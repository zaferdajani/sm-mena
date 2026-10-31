"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { setAvailabilityAction } from "@/app/[locale]/(main)/studio/availability-actions";

/** "Open to new projects": one switch, saved at once, never pre-decided for the owner beyond the sign-up default (on). */
export function AvailabilityToggle({ initial, compact = false }: { initial: boolean; compact?: boolean }) {
  const t = useTranslations("Availability");
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  const toggle = (next: boolean) => {
    const before = on;
    setOn(next);
    setError(false);
    start(async () => {
      const r = await setAvailabilityAction(next);
      if ("error" in r) {
        setOn(before);
        setError(true);
      }
    });
  };
  return (
    <div className={compact ? "space-y-1" : "space-y-2 rounded-xl border bg-background p-3"} data-testid="availability-toggle" data-state={on ? "open" : "closed"}>
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
        <span className="text-sm font-semibold">{t("label")}</span>
        <span className="flex items-center gap-2 text-sm">
          <span className={on ? "text-brand" : "text-muted-foreground"}>{on ? t("on") : t("off")}</span>
          <input type="checkbox" role="switch" aria-checked={on} checked={on} disabled={pending} onChange={(e) => toggle(e.target.checked)} className="size-5 accent-[var(--primary)]" data-testid="availability-switch" />
        </span>
      </label>
      {!compact && <p className="text-xs text-muted-foreground">{t("hint")}</p>}
      {error && <p role="alert" className="text-xs text-destructive">{t("error")}</p>}
    </div>
  );
}
