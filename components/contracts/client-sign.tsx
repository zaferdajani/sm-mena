"use client";

import { PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { clientDeclineAction, clientSignAction } from "@/app/[locale]/(main)/contract-actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ClientSign({ token }: { token: string }) {
  const t = useTranslations("Contracts.client");
  const [state, action] = useActionState(clientSignAction, undefined);
  return (
    <section className="space-y-3 rounded-2xl border-2 border-brand/40 bg-brand/5 p-4" data-testid="client-sign">
      <h2 className="flex items-center gap-2 font-semibold">
        <PenLine className="size-5 text-brand" /> {t("sign")}
      </h2>
      <form action={action} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <div className="grid gap-1.5">
          <Label htmlFor="signer">{t("signer")}</Label>
          <Input id="signer" name="signer" required minLength={3} className="bg-background font-serif text-lg italic" dir="auto" />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="agree" className="mt-0.5 size-4 accent-[var(--brand)]" />
          {t("agree")}
        </label>
        <FormError message={state?.error ? t(`errors.${state.error}` as "errors.agree") : undefined} />
        <SubmitButton className="h-11 w-full">{t("signButton")}</SubmitButton>
      </form>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">{t("decline")}</summary>
        <form action={clientDeclineAction} className="mt-2 flex gap-2">
          <input type="hidden" name="token" value={token} />
          <Input name="reason" placeholder={t("declineReason")} className="bg-background" dir="auto" />
          <SubmitButton variant="outline">{t("decline")}</SubmitButton>
        </form>
      </details>
    </section>
  );
}
