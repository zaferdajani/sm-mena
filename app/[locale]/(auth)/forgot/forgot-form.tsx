"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestResetAction, resetPasswordAction, type ForgotState } from "../forgot-actions";

/** Email → code → new password (docs/61). */
export function ForgotForm() {
  const t = useTranslations("Forgot");
  const [sent, requestAction] = useActionState(requestResetAction, undefined);
  const [checked, resetAction] = useActionState(resetPasswordAction, undefined);
  const err = (s: ForgotState) => (s?.error ? t(`errors.${s.error}` as "errors.email") : undefined);
  const email = checked?.email ?? sent?.email;

  if (sent?.step === "code" || checked?.step === "code") {
    return (
      <form action={resetAction} className="grid gap-4" data-testid="forgot-reset">
        <p className="text-sm">{t("codeSent", { email: email ?? "" })}</p>
        {sent?.shownCode && (
          <p className="rounded-lg bg-muted p-2 text-sm" data-testid="forgot-shown-code">
            {t("testCode")} <b className="font-mono" dir="ltr">{sent.shownCode}</b>
          </p>
        )}
        <input type="hidden" name="email" value={email ?? ""} />
        <div className="grid gap-1.5">
          <Label htmlFor="code">{t("code")}</Label>
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required dir="ltr" className="max-w-40 text-center text-lg tracking-[0.4em]" autoFocus />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">{t("newPassword")}</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required dir="ltr" />
          <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="confirm">{t("confirm")}</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required dir="ltr" />
        </div>
        <FormError message={err(checked)} />
        <SubmitButton className="h-10 w-full">{t("save")}</SubmitButton>
        <p className="text-xs text-muted-foreground">{t("codeHelp")}</p>
      </form>
    );
  }

  return (
    <form action={requestAction} className="grid gap-4" data-testid="forgot-email">
      <div className="grid gap-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required dir="ltr" autoFocus />
      </div>
      <FormError message={err(sent)} />
      <SubmitButton className="h-10 w-full">{t("sendCode")}</SubmitButton>
    </form>
  );
}
