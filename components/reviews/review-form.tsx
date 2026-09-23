"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { inquiryReviewAction, inviteReviewAction } from "@/app/[locale]/(main)/review-actions";
import { FormError } from "@/components/form-error";
import { Field } from "@/components/studio/chips";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { serviceLabel } from "@/lib/labels";
import { StarInput } from "./star-input";

export function ReviewForm({ mode, token, agencyId, services }: { mode: "invite" | "inquiry"; token?: string; agencyId?: string; services: string[] }) {
  const t = useTranslations("Reviews");
  const locale = useLocale();
  const [state, action] = useActionState(mode === "invite" ? inviteReviewAction : inquiryReviewAction, undefined);
  if (state?.ok) {
    return (
      <p role="status" className="rounded-xl bg-accent px-4 py-6 text-center text-accent-foreground" data-testid="review-thanks">
        ✓ {t("form.thanks")}
      </p>
    );
  }
  return (
    <form action={action} className="grid gap-5" data-testid="review-form">
      <FormError message={state?.error ? t(`form.errors.${state.error}`) : undefined} />
      {token && <input type="hidden" name="token" value={token} />}
      {agencyId && <input type="hidden" name="agencyId" value={agencyId} />}
      <StarInput name="rating" label={t("form.overall")} required />
      <div className="grid grid-cols-2 gap-4">
        {(["quality", "communication", "value", "timeliness"] as const).map((k) => (
          <StarInput key={k} name={k} label={t(`sub.${k}`)} size="size-5" />
        ))}
      </div>
      <Field label={t("form.body")} htmlFor="review-body">
        <Textarea id="review-body" name="body" rows={5} minLength={20} maxLength={2000} required placeholder={t("form.bodyPlaceholder")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("form.name")} htmlFor="review-name">
          <Input id="review-name" name="name" required maxLength={60} autoComplete="given-name" />
        </Field>
        <Field label={t("form.business")} htmlFor="review-business">
          <Input id="review-business" name="business" maxLength={100} autoComplete="organization" />
        </Field>
      </div>
      {services.length > 0 && (
        <Field label={t("form.service")} htmlFor="review-service">
          <select id="review-service" name="service" className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm">
            <option value="">{t("form.anyService")}</option>
            {services.map((s) => (
              <option key={s} value={s}>{serviceLabel(s, locale)}</option>
            ))}
          </select>
        </Field>
      )}
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-[var(--primary)]" />
        {t("form.consent")}
      </label>
      <SubmitButton className="h-11 text-base">{t("form.submit")}</SubmitButton>
    </form>
  );
}
