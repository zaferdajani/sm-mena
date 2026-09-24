"use client";

import { PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { answerNdaAction, signNdaAction } from "@/app/[locale]/(main)/nda-actions";
import { SignaturePad } from "@/components/contracts/signature-pad";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** The client's side of an NDA: sign (typed name + drawn signature), ask for a change, or decline. */
export function NdaSign({ token }: { token: string }) {
  const t = useTranslations("Agreements.ndaClient");
  const tl = useTranslations("Agreements");
  const [state, action] = useActionState(signNdaAction, undefined);
  const [answer, answerAction] = useActionState(answerNdaAction, undefined);
  return (
    <section className="space-y-3 rounded-2xl border-2 border-brand/40 bg-brand/5 p-4" data-testid="nda-sign">
      <h2 className="flex items-center gap-2 font-semibold">
        <PenLine className="size-5 text-brand" /> {t("sign")}
      </h2>
      <form action={action} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <div className="grid gap-1.5">
          <Label htmlFor="nda-signer">{t("signer")}</Label>
          <Input id="nda-signer" name="signer" required minLength={3} className="bg-background font-serif text-lg italic" dir="auto" />
        </div>
        <SignaturePad name="signature" label={tl("drawSignature")} clearLabel={tl("clear")} hint={tl("drawHint")} required requiredMessage={tl("drawRequired")} />
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="agree" className="mt-0.5 size-4 accent-[var(--brand)]" />
          {tl("clientDeclaration")}
        </label>
        <FormError message={state?.error ? t(`errors.${state.error}` as "errors.agree") : undefined} />
        <SubmitButton className="h-11 w-full">{t("signButton")}</SubmitButton>
      </form>
      {answer?.ok ? (
        <p className="rounded-lg bg-background p-2 text-sm" role="status">{t("answered")}</p>
      ) : (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">{t("amendOrDecline")}</summary>
          <form action={answerAction} className="mt-2 space-y-2">
            <input type="hidden" name="token" value={token} />
            <Textarea name="note" rows={3} placeholder={tl("amendPh")} className="bg-background" dir="auto" />
            <FormError message={answer?.error ? tl("amendError") : undefined} />
            <div className="flex flex-wrap gap-2">
              <SubmitButton variant="outline" name="kind" value="amend">{tl("amendSend")}</SubmitButton>
              <SubmitButton variant="ghost" name="kind" value="decline">{t("decline")}</SubmitButton>
            </div>
          </form>
        </details>
      )}
    </section>
  );
}
