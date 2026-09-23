"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { connectGoogleAction } from "@/app/[locale]/(main)/studio/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";

export function GoogleForm({ current }: { current: string | null }) {
  const t = useTranslations("Reviews.studio");
  const tc = useTranslations("Common");
  const [state, action] = useActionState(connectGoogleAction, undefined);
  return (
    <form action={action} className="grid gap-2 rounded-xl border p-4" data-testid="google-form">
      <h2 className="font-semibold">{t("google")}</h2>
      <p className="text-xs text-muted-foreground">{t("googleHint")}</p>
      <div className="flex gap-2">
        <Input name="google" dir="ltr" defaultValue={current ?? ""} placeholder="https://maps.google.com/…" className="h-9" />
        <SubmitButton className="h-9 shrink-0">{tc("save")}</SubmitButton>
      </div>
      {state?.status === "connected" && <p className="text-sm text-brand">{t("googleConnected", { name: state.name ?? "", rating: state.rating ?? "—", count: state.count ?? 0 })}</p>}
      {state?.status === "saved" && <p className="text-sm text-muted-foreground">{t("googleSaved")}</p>}
      {state?.status === "not_found" && <p className="text-sm text-destructive">{t("googleNotFound")}</p>}
    </form>
  );
}
