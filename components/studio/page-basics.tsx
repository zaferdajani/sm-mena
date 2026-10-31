"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { saveBasicsAction } from "@/app/[locale]/(main)/studio/strength-actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";

type Option = { key: string; label: string };

/** Team size and the smallest project taken: the two facts clients filter by on every agency directory (docs/65). */
export function PageBasics({ teamSizes, teamSize, startingPriceJod }: { teamSizes: Option[]; teamSize: string | null; startingPriceJod: number | null }) {
  const t = useTranslations("Strength.basics");
  const [state, action] = useActionState(saveBasicsAction, undefined);
  const select = "min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base";
  return (
    <form action={action} className="space-y-4 rounded-2xl border p-4" data-testid="page-basics">
      <div>
        <h2 className="text-lg font-bold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("body")}</p>
      </div>
      <FormError message={state?.error ? t("error") : undefined} />
      {state?.ok && <p role="status" className="rounded-lg bg-brand-soft p-3 text-sm font-medium">✓ {t("saved")}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-semibold">{t("teamSize")}</span>
          <select name="teamSize" defaultValue={teamSize ?? ""} className={select} data-testid="basics-team">
            <option value="">{t("teamSizeNone")}</option>
            {teamSizes.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">{t("minProject")}</span>
          <Input name="startingPriceJod" type="number" min={1} max={100000} dir="ltr" inputMode="numeric" defaultValue={startingPriceJod ?? ""} className="min-h-11 text-base" data-testid="basics-min" />
          <span className="block text-xs text-muted-foreground">{t("minProjectHint")}</span>
        </label>
      </div>
      <SubmitButton className="min-h-11 w-full sm:w-auto" data-testid="basics-save">{t("save")}</SubmitButton>
    </form>
  );
}
