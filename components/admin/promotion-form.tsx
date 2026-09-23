"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { createPromotionAction } from "@/app/[locale]/(main)/admin/actions";
import { FormError } from "@/components/form-error";
import { Field } from "@/components/studio/chips";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";

type Option = { key: string; label: string };

export function PromotionForm({ services, cities, today, inAWeek }: { services: Option[]; cities: Option[]; today: string; inAWeek: string }) {
  const t = useTranslations("Admin.promo");
  const [state, action] = useActionState(createPromotionAction, undefined);
  const select = "h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm";
  return (
    <form action={action} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">{t("new")}</h2>
      <div className="sm:col-span-2">
        <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      </div>
      <Field label={t("agencyHandle")} htmlFor="handle"><Input id="handle" name="handle" required dir="ltr" placeholder="@" /></Field>
      <Field label={t("placement")} htmlFor="placement">
        <select id="placement" name="placement" className={select}>
          {(["feed", "strip", "explore"] as const).map((p) => <option key={p} value={p}>{t(`placements.${p}`)}</option>)}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label={t("postId")} htmlFor="postId"><Input id="postId" name="postId" dir="ltr" /></Field>
      </div>
      <Field label={t("service")} htmlFor="service">
        <select id="service" name="service" className={select}>
          <option value="">—</option>
          {services.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </Field>
      <Field label={t("city")} htmlFor="city">
        <select id="city" name="city" className={select}>
          <option value="">—</option>
          {cities.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </Field>
      <Field label={t("starts")} htmlFor="startsAt"><Input id="startsAt" name="startsAt" type="date" required defaultValue={today} dir="ltr" /></Field>
      <Field label={t("ends")} htmlFor="endsAt"><Input id="endsAt" name="endsAt" type="date" required defaultValue={inAWeek} dir="ltr" /></Field>
      <div className="sm:col-span-2"><Field label={t("note")} htmlFor="note"><Input id="note" name="note" maxLength={200} /></Field></div>
      <SubmitButton className="sm:col-span-2">{t("create")}</SubmitButton>
    </form>
  );
}
