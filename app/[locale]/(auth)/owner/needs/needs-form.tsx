"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { saveOwnerNeedAction, type OwnerNeedState } from "@/app/[locale]/(auth)/owner-actions";
import { CountryCityField, type CountryOption } from "@/components/country-city-field";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OWNER_TIMINGS } from "@/lib/validation/owner-needs";

type Existing = { businessType: string | null; services: string[]; timing: string; whatsapp: string | null; note: string | null } | null;

const field = "h-9 rounded-lg border border-input bg-transparent px-2 text-sm";

/** The owner's one screen (docs/58): country and city, business type, needed service groups, timing, optional WhatsApp and note. */
export function OwnerNeedsForm({ countries, defaultCountry, defaultCity, businessTypes, serviceGroups, existing }: {
  countries: CountryOption[];
  defaultCountry: string;
  defaultCity?: string;
  businessTypes: { key: string; label: string }[];
  serviceGroups: { key: string; label: string }[];
  existing: Existing;
}) {
  const t = useTranslations("OwnerEarly.needs");
  const [state, action] = useActionState<OwnerNeedState, FormData>(saveOwnerNeedAction, undefined);
  return (
    <form action={action} className="space-y-5" data-testid="owner-needs-form">
      <div className="grid grid-cols-2 gap-3">
        <CountryCityField countries={countries} defaultCountry={defaultCountry} defaultCity={defaultCity} countryLabel={t("country")} cityLabel={t("city")} className={field} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="businessType">{t("businessType")}</Label>
        <select id="businessType" name="businessType" defaultValue={existing?.businessType ?? ""} className={field} data-testid="owner-business-type">
          <option value="">{t("businessTypeAny")}</option>
          {businessTypes.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
        </select>
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">{t("services")}</legend>
        <p className="text-xs text-muted-foreground">{t("servicesHint")}</p>
        <div className="flex flex-wrap gap-2" data-testid="owner-services">
          {serviceGroups.map((g) => (
            <label key={g.key} className="sw-choice-chip">
              <input type="checkbox" name="services" value={g.key} defaultChecked={existing?.services.includes(g.key) ?? false} />
              <span>{g.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">{t("timing")}</legend>
        <div className="flex flex-wrap gap-2" data-testid="owner-timing">
          {OWNER_TIMINGS.map((k, i) => (
            <label key={k} className="sw-choice-chip">
              <input type="radio" name="timing" value={k} defaultChecked={existing ? existing.timing === k : i === 0} required />
              <span>{t(`timings.${k}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-1.5">
        <Label htmlFor="whatsapp">{t("whatsapp")}</Label>
        <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" defaultValue={existing?.whatsapp ?? ""} placeholder="+962 7…" />
        <p className="text-xs text-muted-foreground">{t("whatsappHint")}</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="note">{t("note")}</Label>
        <Textarea id="note" name="note" rows={3} maxLength={400} defaultValue={existing?.note ?? ""} placeholder={t("notePlaceholder")} />
      </div>
      <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      <SubmitButton className="w-full" testId="owner-save">{t(existing ? "saveEdit" : "save")}</SubmitButton>
      <p className="text-xs leading-6 text-muted-foreground">{t("privacy")}</p>
    </form>
  );
}
