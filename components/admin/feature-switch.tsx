"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";
import { setFeatureAction, tickGoLiveAction, type FeatureActionState } from "@/app/[locale]/(main)/admin/feature-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type State = "on" | "soon" | "off";

/** One feature's switch: on / coming soon / off, and the pilot agencies that get it early. */
export function FeatureSwitch({ featureKey, state, pilots }: { featureKey: string; state: State; pilots: string[] }) {
  const t = useTranslations("Features");
  const [value, setValue] = useState<State>(state);
  const [result, action, pending] = useActionState<FeatureActionState, FormData>(setFeatureAction, undefined);
  const changed = value !== state;
  return (
    <form action={action} className="grid gap-2" data-testid={`feature-${featureKey}`}>
      <input type="hidden" name="key" value={featureKey} />
      <div role="radiogroup" aria-label={t(`items.${featureKey as "contracts"}.name`)} className="inline-flex w-fit overflow-hidden rounded-lg border text-sm">
        {(["on", "soon", "off"] as const).map((s) => (
          <label
            key={s}
            className={cn(
              "cursor-pointer px-3 py-1.5 has-[:focus-visible]:ring-2",
              value === s && (s === "on" ? "bg-brand text-white" : s === "soon" ? "bg-amber-500 text-white" : "bg-muted-foreground text-background"),
            )}
          >
            <input type="radio" name="state" value={s} checked={value === s} onChange={() => setValue(s)} className="sr-only" data-testid={`feature-${featureKey}-${s}`} />
            {t(`states.${s}`)}
          </label>
        ))}
      </div>
      {value === "soon" && (
        <label className="grid gap-1 text-xs text-muted-foreground">
          {t("pilots")}
          <input name="pilots" defaultValue={pilots.join(", ")} dir="ltr" placeholder="agency.handle, other.agency" className="h-9 rounded-md border bg-transparent px-2 text-sm text-foreground" data-testid={`feature-${featureKey}-pilots`} />
        </label>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant={changed ? "default" : "outline"} disabled={pending} data-testid={`feature-${featureKey}-save`}>
          {t("save")}
        </Button>
        {result?.ok && !pending && <span className="text-xs text-brand" role="status">{t("saved")}</span>}
        {result?.error && <span className="text-xs text-destructive" role="alert">{t("error")}</span>}
      </div>
    </form>
  );
}

/** A go-live step the owner ticks when it's done outside the platform. */
export function GoLiveTick({ step, done, label }: { step: string; done: boolean; label: string }) {
  const [pending, start] = useTransition();
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input type="checkbox" defaultChecked={done} disabled={pending} onChange={(e) => start(() => tickGoLiveAction(step, e.target.checked))} className="size-4 accent-[var(--primary)]" data-testid={`golive-${step}`} />
      <span>{label}</span>
    </label>
  );
}
