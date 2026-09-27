"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { createAgentAction, recordPayoutAction, saveTiersAction } from "@/app/[locale]/(main)/admin/agent-actions";
import { FormError } from "@/components/form-error";
import { PhoneField } from "@/components/forms/phone-field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Admin → Agents: add an agent; the one-time password is shown once. */
export function CreateAgentForm({ phoneCountry }: { phoneCountry: string }) {
  const t = useTranslations("AdminAgents");
  const [state, action] = useActionState(createAgentAction, undefined);
  return (
    <form action={action} className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-2" data-testid="agent-create">
      <h2 className="font-semibold sm:col-span-2">{t("add")}</h2>
      <div className="grid gap-1.5">
        <Label htmlFor="ag-name">{t("name")}</Label>
        <Input id="ag-name" name="name" required maxLength={80} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ag-email">{t("email")}</Label>
        <Input id="ag-email" name="email" type="email" required dir="ltr" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ag-phone">{t("phone")}</Label>
        <PhoneField id="ag-phone" name="phone" defaultCountry={phoneCountry} countryLabel={t("phone")} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ag-code">{t("code")}</Label>
        <Input id="ag-code" name="code" required dir="ltr" autoCapitalize="none" maxLength={24} placeholder="ahmad" />
        <p className="text-xs text-muted-foreground">{t("codeHint")}</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ag-rate">{t("rate")}</Label>
        <Input id="ag-rate" name="rate" type="number" min={0} step="0.5" defaultValue={5} required dir="ltr" className="max-w-32" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ag-note">{t("note")}</Label>
        <Input id="ag-note" name="note" maxLength={500} />
      </div>
      <div className="sm:col-span-2">
        <FormError message={state?.error ? t(`errors.${state.error}` as "errors.invalid") : undefined} />
        {state?.created && (
          <div role="status" className="mb-3 space-y-1 rounded-xl border border-brand-line bg-brand-soft p-3 text-sm" data-testid="agent-created">
            <p className="font-semibold">{t("created", { name: state.created.name })}</p>
            <p>
              {t("createdLogin")} <bdi dir="ltr" className="font-mono">{state.created.email}</bdi> · <bdi dir="ltr" className="font-mono" data-testid="agent-password">{state.created.password}</bdi>
            </p>
            <p className="text-xs text-muted-foreground">{t("createdNote")}</p>
          </div>
        )}
        <SubmitButton>{t("addButton")}</SubmitButton>
      </div>
    </form>
  );
}

export function PayoutForm({ agentId }: { agentId: string }) {
  const t = useTranslations("AdminAgents");
  const [state, action] = useActionState(recordPayoutAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2" data-testid="agent-payout">
      <input type="hidden" name="agentId" value={agentId} />
      <div className="grid gap-1.5">
        <Label htmlFor="po-amount">{t("payoutAmount")}</Label>
        <Input id="po-amount" name="amount" type="number" min={0.5} step="0.5" required dir="ltr" className="max-w-32" />
      </div>
      <div className="grid min-w-40 flex-1 gap-1.5">
        <Label htmlFor="po-note">{t("payoutNote")}</Label>
        <Input id="po-note" name="note" maxLength={300} placeholder={t("payoutNotePlaceholder")} />
      </div>
      <SubmitButton>{t("recordPayout")}</SubmitButton>
      <FormError message={state?.error ? t("errors.invalid") : undefined} />
    </form>
  );
}

export function TiersForm({ value }: { value: string }) {
  const t = useTranslations("AdminAgents");
  const [state, action] = useActionState(saveTiersAction, undefined);
  return (
    <form action={action} className="space-y-2 rounded-2xl border p-4" data-testid="agent-tiers">
      <h2 className="font-semibold">{t("tiersTitle")}</h2>
      <p className="text-xs text-muted-foreground">{t("tiersHint")}</p>
      <textarea name="tiers" defaultValue={value} rows={5} dir="ltr" className="w-full max-w-60 rounded-md border bg-transparent p-2 font-mono text-sm" />
      <FormError message={state?.error ? t("errors.tiers") : undefined} />
      <SubmitButton>{t("saveTiers")}</SubmitButton>
    </form>
  );
}
