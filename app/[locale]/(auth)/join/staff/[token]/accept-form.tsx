"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { acceptInviteAction } from "@/app/[locale]/(main)/admin/team-actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AcceptStaffForm({ token }: { token: string }) {
  const t = useTranslations("AdminTeam.accept");
  const te = useTranslations("AdminTeam.errors");
  const [state, action] = useActionState(acceptInviteAction, undefined);
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" name="password" type="password" minLength={12} required autoComplete="new-password" />
        <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">{t("confirm")}</Label>
        <Input id="confirm" name="confirm" type="password" minLength={12} required autoComplete="new-password" />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {te.has(state.error) ? te(state.error) : te("invalid")}
        </p>
      )}
      <SubmitButton className="w-full">{t("submit")}</SubmitButton>
    </form>
  );
}
