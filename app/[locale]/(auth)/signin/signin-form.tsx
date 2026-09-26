"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { requestCodeAction, verifyCodeAction, type SignInState } from "@/app/[locale]/(auth)/signin-actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";

/** Email → code sign-in for client accounts (docs/41). */
export function SignInForm({ next }: { next: string }) {
  const t = useTranslations("ClientAuth");
  const [sent, requestAction] = useActionState(requestCodeAction, undefined);
  const [checked, verifyAction] = useActionState(verifyCodeAction, undefined);
  const err = (s: SignInState) => (s?.error ? t(`errors.${s.error}` as "errors.email") : undefined);
  const email = checked?.email ?? sent?.email;

  if (sent?.step === "code" || checked?.step === "code") {
    return (
      <form action={verifyAction} className="space-y-4" data-testid="signin-code">
        <p className="text-sm">{t("codeSent", { email: email ?? "" })}</p>
        {sent?.shownCode && (
          <p className="rounded-lg bg-muted p-2 text-sm" data-testid="signin-shown-code">
            {t("testCode")} <b className="font-mono" dir="ltr">{sent.shownCode}</b>
          </p>
        )}
        <input type="hidden" name="email" value={email ?? ""} />
        <input type="hidden" name="next" value={next} />
        <div className="grid gap-1.5">
          <Label htmlFor="code">{t("code")}</Label>
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required dir="ltr" className="max-w-40 text-center text-lg tracking-[0.4em]" autoFocus />
        </div>
        <FormError message={err(checked)} />
        <SubmitButton className="w-full">{t("verify")}</SubmitButton>
        <p className="text-xs text-muted-foreground">{t("codeHelp")}</p>
      </form>
    );
  }

  return (
    <form action={requestAction} className="space-y-4" data-testid="signin-email">
      <div className="grid gap-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required dir="ltr" autoFocus />
      </div>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" name="consent" required className="mt-0.5" />
        <span>
          {t("consent")}{" "}
          <Link href="/legal" className="underline">
            {t("privacy")}
          </Link>
        </span>
      </label>
      <FormError message={err(sent) ?? err(checked)} />
      <SubmitButton className="w-full">{t("sendCode")}</SubmitButton>
    </form>
  );
}
