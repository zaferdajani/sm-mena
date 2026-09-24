"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { recordManualPaymentAction } from "@/app/[locale]/(main)/admin/payment-actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const select = "h-9 w-full rounded-md border bg-background px-2 text-sm";

export function ManualPaymentForm() {
  const t = useTranslations("AdminPayments");
  const [state, action] = useActionState(recordManualPaymentAction, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <div className="sm:col-span-3">
        <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
        {state?.ok && <p className="text-sm text-brand" role="status">{t("recorded")}</p>}
      </div>
      <div className="grid gap-1">
        <Label htmlFor="mp-handle">{t("agencyHandle")}</Label>
        <Input id="mp-handle" name="handle" required dir="ltr" placeholder="nakhla.studio" />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="mp-plan">{t("plan")}</Label>
        <select id="mp-plan" name="plan" className={select}>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="mp-months">{t("months")}</Label>
        <select id="mp-months" name="months" className={select}>
          {[1, 3, 12].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="mp-method">{t("method")}</Label>
        <select id="mp-method" name="method" className={select}>
          {(["cliq", "bank_transfer", "cash", "card"] as const).map((m) => (
            <option key={m} value={m}>{t(`methods.${m}`)}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="mp-amount">{t("amount")}</Label>
        <Input id="mp-amount" name="amount" type="number" step="0.001" min="0" required dir="ltr" />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="mp-ref">{t("reference")}</Label>
        <Input id="mp-ref" name="reference" dir="ltr" />
      </div>
      <div className="grid gap-1 sm:col-span-2">
        <Label htmlFor="mp-note">{t("note")}</Label>
        <Input id="mp-note" name="note" dir="auto" />
      </div>
      <div className="flex items-end">
        <SubmitButton className="h-9 w-full">{t("record")}</SubmitButton>
      </div>
    </form>
  );
}
