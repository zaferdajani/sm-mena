"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { partnerSubmitAction } from "@/app/[locale]/(main)/share-actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** The partner hands its milestone to the client (docs/40). */
export function PartnerSubmit({ shareId }: { shareId: string }) {
  const t = useTranslations("Shares.work");
  const [state, action] = useActionState(partnerSubmitAction, undefined);
  return (
    <form action={action} className="space-y-3 rounded-2xl border p-4" data-testid="partner-submit">
      <input type="hidden" name="shareId" value={shareId} />
      <h2 className="font-semibold">{t("submitTitle")}</h2>
      <div className="grid gap-1.5">
        <Label htmlFor="partner-note">{t("submitNote")}</Label>
        <Textarea id="partner-note" name="note" maxLength={2000} rows={3} />
      </div>
      <FormError message={state?.error ? t(`errors.${state.error}` as "errors.locked") : undefined} />
      {state?.ok && <p role="status" className="text-sm font-medium text-brand">{t("submitted")}</p>}
      <SubmitButton>{t("submit")}</SubmitButton>
    </form>
  );
}
