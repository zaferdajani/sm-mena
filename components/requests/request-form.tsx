"use client";

import { CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { createRequestAction } from "@/app/[locale]/(main)/request-actions";
import { FormError } from "@/components/form-error";
import { ChipGroup, Field } from "@/components/studio/chips";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";

type Option = { key: string; label: string };

export type RequestDefaults = {
  services?: string[];
  platforms?: string[];
  city?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  description?: string;
};

export function RequestForm({
  services,
  cities,
  defaults = {},
  source = "form",
}: {
  services: Option[];
  cities: Option[];
  defaults?: RequestDefaults;
  source?: "form" | "ai";
}) {
  const t = useTranslations("Requests");
  const locale = useLocale();
  const [state, action] = useActionState(createRequestAction, undefined);
  const select = "h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm";

  if (state?.token) {
    const link = `${window.location.origin}/${locale}/r/${state.token}`;
    return (
      <div className="space-y-3 rounded-xl border border-brand-line bg-brand-soft p-4 text-sm" data-testid="request-created">
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="size-5 text-brand" />
          {t("created", { count: state.invited ?? 0 })}
        </p>
        <p>{t("saveLink")}</p>
        <a href={link} className="block break-all font-mono text-xs text-brand underline" dir="ltr" data-testid="request-link">
          {link}
        </a>
        <Link href={`/requests/${state.requestId}`} className="inline-block font-medium text-brand">
          {t("pageTitle")} →
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4" data-testid="request-form">
      <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      <input type="hidden" name="source" value={source} />
      {defaults.platforms?.map((p) => <input key={p} type="hidden" name="platforms" value={p} />)}
      <Field label={t("services")}>
        <ChipGroup name="services" options={services} defaultValues={defaults.services} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("city")} htmlFor="req-city">
          <select id="req-city" name="city" defaultValue={defaults.city ?? ""} className={select}>
            <option value="">{t("anyCity")}</option>
            {cities.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </Field>
        <Field label={t("timeline")} htmlFor="req-timeline">
          <select id="req-timeline" name="timeline" defaultValue="" className={select}>
            <option value="">—</option>
            {(["asap", "this_month", "within_3_months"] as const).map((k) => <option key={k} value={k}>{t(`timelines.${k}`)}</option>)}
          </select>
        </Field>
        <Field label={t("budgetMin")} htmlFor="req-min">
          <Input id="req-min" name="budgetMin" type="number" min={0} dir="ltr" defaultValue={defaults.budgetMin ?? ""} />
        </Field>
        <Field label={t("budgetMax")} htmlFor="req-max">
          <Input id="req-max" name="budgetMax" type="number" min={0} dir="ltr" defaultValue={defaults.budgetMax ?? ""} />
        </Field>
      </div>
      <Field label={t("description")} htmlFor="req-desc">
        <Textarea id="req-desc" name="description" rows={4} minLength={10} maxLength={3000} required defaultValue={defaults.description} placeholder={t("descriptionPlaceholder")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("name")} htmlFor="req-name">
          <Input id="req-name" name="name" required maxLength={80} autoComplete="name" />
        </Field>
        <Field label={t("phone")} htmlFor="req-phone">
          <Input id="req-phone" name="phone" type="tel" required dir="ltr" autoComplete="tel" placeholder="07X XXX XXXX" />
        </Field>
      </div>
      <Field label={t("business")} htmlFor="req-business">
        <Input id="req-business" name="business" maxLength={120} autoComplete="organization" />
      </Field>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-[var(--primary)]" />
        {t("consent")}
      </label>
      <SubmitButton className="h-11 text-base">{t("submit")}</SubmitButton>
    </form>
  );
}
