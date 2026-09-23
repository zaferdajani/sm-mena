"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "../actions";

export function LoginForm() {
  const t = useTranslations("Auth");
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="grid gap-4">
      <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      <div className="grid gap-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required dir="ltr" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required dir="ltr" />
      </div>
      <SubmitButton className="h-10 w-full">{t("loginButton")}</SubmitButton>
    </form>
  );
}
