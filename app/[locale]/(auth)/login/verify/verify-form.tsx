"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyLogin } from "../../actions";

export function VerifyForm() {
  const t = useTranslations("Security");
  const [state, action] = useActionState(verifyLogin, undefined);
  return (
    <form action={action} className="grid gap-4">
      <FormError message={state?.error ? t(`errors.${state.error}` as "errors.badCode") : undefined} />
      <div className="grid gap-1.5">
        <Label htmlFor="code">{t("codeLabel")}</Label>
        <Input
          id="code"
          name="code"
          inputMode="text"
          autoComplete="one-time-code"
          autoFocus
          required
          dir="ltr"
          maxLength={20}
          className="text-center text-lg tracking-widest"
          placeholder="123456"
        />
        <p className="text-xs text-muted-foreground">{t("codeHint")}</p>
      </div>
      <SubmitButton className="h-10 w-full">{t("verifyButton")}</SubmitButton>
    </form>
  );
}
