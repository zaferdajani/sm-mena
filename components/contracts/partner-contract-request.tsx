"use client";

import { FilePlus2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { requestPartnerContractAction } from "@/app/[locale]/(main)/contract-actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Studio → Partners, for an accepted partner: ask it to send you a contract
 * (it does the work, so it writes the contract with you as the client).
 */
export function PartnerContractRequest({ toAgencyId, currency }: { toAgencyId: string; currency: string }) {
  const t = useTranslations("PartnerContracts");
  const [state, action] = useActionState(requestPartnerContractAction, undefined);
  return (
    <details className="w-full rounded-xl border p-3 text-sm" data-testid="partner-contract-request">
      <summary className="flex cursor-pointer items-center gap-2 font-medium">
        <FilePlus2 className="size-4 text-brand" /> {t("request")}
      </summary>
      {state?.ok ? (
        <p className="mt-2 rounded-lg bg-brand/10 p-2" role="status">{t("sent")}</p>
      ) : (
        <form action={action} className="mt-2 grid gap-2">
          <input type="hidden" name="toAgencyId" value={toAgencyId} />
          <p className="text-xs text-muted-foreground">{t("requestHint")}</p>
          <Input name="title" required minLength={3} maxLength={120} placeholder={t("title")} aria-label={t("title")} dir="auto" />
          <Textarea name="brief" maxLength={2000} rows={3} placeholder={t("brief")} aria-label={t("brief")} dir="auto" />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            {t("budget")}
            <Input name="budget" type="number" min={0} step="0.001" className="w-32" dir="ltr" />
            {currency}
          </label>
          <FormError message={state?.error ? t(`errors.${["notPartner", "invalid", "tooMany", "rateLimited"].includes(state.error) ? (state.error as "invalid") : "invalid"}`) : undefined} />
          <SubmitButton className="h-9 justify-self-start">{t("send")}</SubmitButton>
        </form>
      )}
    </details>
  );
}
