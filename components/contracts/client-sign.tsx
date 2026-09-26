"use client";

import { MessageSquareDiff, PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { clientAmendAction, clientDeclineAction, clientSignAction } from "@/app/[locale]/(main)/contract-actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SignaturePad } from "./signature-pad";

/** `hidden` is the client's token, or the contract id with as=buyer for a buying agency. */
export function ClientSign({ hidden }: { hidden: Record<string, string> }) {
  const hiddenInputs = Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />);
  const t = useTranslations("Contracts.client");
  const tl = useTranslations("Agreements");
  const [state, action] = useActionState(clientSignAction, undefined);
  const [amend, amendAction] = useActionState(clientAmendAction, undefined);
  return (
    <section className="space-y-3 rounded-2xl border-2 border-brand/40 bg-brand/5 p-4" data-testid="client-sign">
      <h2 className="flex items-center gap-2 font-semibold">
        <PenLine className="size-5 text-brand" /> {t("sign")}
      </h2>
      <form action={action} className="space-y-3">
        {hiddenInputs}
        <div className="grid gap-1.5">
          <Label htmlFor="signer">{t("signer")}</Label>
          <Input id="signer" name="signer" required minLength={3} className="bg-background font-serif text-lg italic" dir="auto" />
        </div>
        <SignaturePad name="signature" label={tl("drawSignature")} clearLabel={tl("clear")} hint={tl("drawHint")} required requiredMessage={tl("drawRequired")} />
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="agree" className="mt-0.5 size-4 accent-[var(--brand)]" />
          {tl("clientDeclaration")}
        </label>
        <FormError message={state?.error ? t(`errors.${state.error}` as "errors.agree") : undefined} />
        <SubmitButton className="h-11 w-full">{t("signButton")}</SubmitButton>
      </form>
      <details className="text-sm" data-testid="amend-request">
        <summary className="flex cursor-pointer items-center gap-1.5 text-muted-foreground">
          <MessageSquareDiff className="size-4" /> {tl("amendTitle")}
        </summary>
        {amend?.ok ? (
          <p className="mt-2 rounded-lg bg-background p-2" role="status">{tl("amendSent")}</p>
        ) : (
          <form action={amendAction} className="mt-2 space-y-2">
            {hiddenInputs}
            <Textarea name="note" required minLength={5} rows={3} placeholder={tl("amendPh")} className="bg-background" dir="auto" />
            <FormError message={amend?.error ? tl("amendError") : undefined} />
            <SubmitButton variant="outline">{tl("amendSend")}</SubmitButton>
          </form>
        )}
      </details>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">{t("decline")}</summary>
        <form action={clientDeclineAction} className="mt-2 flex gap-2">
          {hiddenInputs}
          <Input name="reason" placeholder={t("declineReason")} className="bg-background" dir="auto" />
          <SubmitButton variant="outline">{t("decline")}</SubmitButton>
        </form>
      </details>
    </section>
  );
}
