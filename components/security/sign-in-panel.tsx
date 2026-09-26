"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { changeEmailAction, changePasswordAction, type AccountResult } from "@/app/[locale]/(main)/security-actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Field({ id, name, label, type = "password", autoComplete, defaultValue }: { id: string; name: string; label: string; type?: string; autoComplete: string; defaultValue?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type={type} autoComplete={autoComplete} required dir="ltr" defaultValue={defaultValue} />
    </div>
  );
}

/** Sign-in details on the Security page: the email you sign in with, and the password. */
export function SignInPanel({ email, mfaEnabled }: { email: string; mfaEnabled: boolean }) {
  const t = useTranslations("Account");
  const [emailState, emailAction] = useActionState(changeEmailAction, undefined);
  const [passState, passAction] = useActionState(changePasswordAction, undefined);
  const err = (s: AccountResult | undefined) => (s?.error ? t(`errors.${s.error}`) : undefined);
  const code = (id: string) =>
    mfaEnabled && (
      <div className="grid gap-1.5">
        <Label htmlFor={id}>{t("code")}</Label>
        <Input id={id} name="code" inputMode="numeric" autoComplete="one-time-code" required dir="ltr" maxLength={20} className="max-w-40 text-center tracking-widest" placeholder="123456" />
      </div>
    );
  const done = (msg: string) => (
    <p role="status" className="flex items-center gap-2 rounded-md bg-brand-soft px-3 py-2 text-sm font-medium text-brand">
      <CheckCircle2 className="size-4" /> {msg}
    </p>
  );

  return (
    <section className="max-w-xl space-y-4" id="sign-in" data-testid="sign-in-details">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("current")} <bdi dir="ltr" className="font-medium text-foreground" data-testid="current-email">{email}</bdi>
        </p>
      </div>

      <form action={emailAction} className="space-y-3 rounded-xl border p-4" data-testid="change-email">
        <h3 className="font-medium">{t("emailTitle")}</h3>
        <Field id="new-email" name="email" type="email" label={t("newEmail")} autoComplete="email" />
        <Field id="email-password" name="password" label={t("password")} autoComplete="current-password" />
        {code("email-code")}
        <FormError message={err(emailState)} />
        {emailState?.done === "email" && done(t("emailDone"))}
        <SubmitButton>{t("saveEmail")}</SubmitButton>
      </form>

      <form action={passAction} className="space-y-3 rounded-xl border p-4" data-testid="change-password">
        <h3 className="font-medium">{t("passwordTitle")}</h3>
        <Field id="old-password" name="password" label={t("password")} autoComplete="current-password" />
        <Field id="new-password" name="newPassword" label={t("newPassword")} autoComplete="new-password" />
        <Field id="confirm-password" name="confirm" label={t("confirm")} autoComplete="new-password" />
        {code("password-code")}
        <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
        <FormError message={err(passState)} />
        {passState?.done === "password" && done(t("passwordDone"))}
        <SubmitButton>{t("savePassword")}</SubmitButton>
      </form>
    </section>
  );
}
