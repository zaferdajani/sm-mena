"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { submitProposalAction } from "@/app/[locale]/(main)/studio/actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "./chips";

export function ProposalForm({ requestId, suggestedPrice }: { requestId: string; suggestedPrice: number | null }) {
  const t = useTranslations("Opportunities.form");
  const tp = useTranslations("Packages");
  const [state, action] = useActionState(submitProposalAction, undefined);
  if (state?.ok) return <p role="status" className="rounded-lg bg-accent p-3 text-sm text-accent-foreground" data-testid="proposal-sent">✓ {t("sent")}</p>;
  return (
    <form action={action} className="grid gap-3 rounded-xl border p-4" data-testid="proposal-form">
      <h2 className="font-semibold">{t("title")}</h2>
      <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      <input type="hidden" name="requestId" value={requestId} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("price")} htmlFor="p-price">
          <Input id="p-price" name="priceJod" type="number" min={1} required dir="ltr" defaultValue={suggestedPrice ?? ""} />
        </Field>
        <Field label={t("billing")} htmlFor="p-billing">
          <select id="p-billing" name="billing" className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm">
            <option value="monthly">{tp("perMonth")}</option>
            <option value="one_off">{tp("oneOff")}</option>
          </select>
        </Field>
      </div>
      <Field label={t("timeline")} htmlFor="p-timeline">
        <Input id="p-timeline" name="timeline" required minLength={2} maxLength={200} placeholder={t("timelinePlaceholder")} />
      </Field>
      <Field label={t("message")} htmlFor="p-message">
        <Textarea id="p-message" name="message" required minLength={10} maxLength={2000} rows={4} placeholder={t("messagePlaceholder")} />
      </Field>
      <SubmitButton>{t("submit")}</SubmitButton>
    </form>
  );
}
