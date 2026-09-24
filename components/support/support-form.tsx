"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { submitSupportAction } from "@/app/[locale]/(main)/support-actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SupportForm({ from, kind }: { from: string; kind: "bug" | "question" | "suggestion" }) {
  const t = useTranslations("Support");
  const [state, action] = useActionState(submitSupportAction, undefined);
  if (state?.done) {
    return (
      <p className="flex items-center gap-2 rounded-xl border p-4 text-sm" role="status" data-testid="support-sent">
        <CheckCircle2 className="size-5 text-brand" /> {t("thanks")}
      </p>
    );
  }
  return (
    <form action={action} className="grid gap-4">
      <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      <input type="hidden" name="from" value={from} />
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">{t("kind")}</legend>
        <div className="flex flex-wrap gap-2">
          {(["bug", "question", "suggestion"] as const).map((k) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/10">
              <input type="radio" name="kind" value={k} defaultChecked={k === kind} className="accent-[var(--brand)]" />
              {t(`kinds.${k}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-1.5">
        <Label htmlFor="message">{t("message")}</Label>
        <Textarea id="message" name="message" rows={5} required minLength={5} maxLength={4000} dir="auto" placeholder={t("messageHint")} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" dir="ltr" autoComplete="email" />
        <p className="text-xs text-muted-foreground">{t("emailHint")}</p>
      </div>
      <SubmitButton className="h-10">{t("send")}</SubmitButton>
    </form>
  );
}
