"use client";

import { Check, Handshake, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";
import { answerPartnerAction, sendPartnerRequestAction } from "@/app/[locale]/(main)/studio/actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChipGroup } from "./chips";

type Option = { key: string; label: string };

/** "Request partnership" on a suggested freelancer or agency: which roles, and a short note. */
export function PartnerRequestButton({ toAgencyId, name, roles, matched }: { toAgencyId: string; name: string; roles: Option[]; matched: string[] }) {
  const t = useTranslations("Partners");
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(sendPartnerRequestAction, undefined);
  if (state?.ok) return <p className="text-sm text-brand" role="status">✓ {t("sent")}</p>;
  if (!open)
    return (
      <Button type="button" size="sm" className="gap-1.5" onClick={() => setOpen(true)} data-testid="partner-open">
        <Handshake className="size-4" /> {t("request")}
      </Button>
    );
  return (
    <form action={action} className="grid w-full gap-2 rounded-lg border p-3" data-testid="partner-form">
      <input type="hidden" name="toAgencyId" value={toAgencyId} />
      <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      <p className="text-sm font-medium">{t("requestTitle", { name })}</p>
      <ChipGroup name="roles" options={roles.filter((r) => matched.includes(r.key))} defaultValues={matched} />
      <Textarea name="message" rows={3} maxLength={1000} placeholder={t("messagePlaceholder")} />
      <div className="flex gap-2">
        <SubmitButton className="h-9">{t("send")}</SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>{t("cancel")}</Button>
      </div>
    </form>
  );
}

export function PartnerAnswerButtons({ requestId, incoming }: { requestId: string; incoming: boolean }) {
  const t = useTranslations("Partners");
  const [pending, start] = useTransition();
  if (!incoming)
    return (
      <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => start(() => answerPartnerAction(requestId, "cancelled"))}>
        {t("withdraw")}
      </Button>
    );
  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" className="gap-1" disabled={pending} onClick={() => start(() => answerPartnerAction(requestId, "accepted"))} data-testid="partner-accept">
        <Check className="size-4" /> {t("accept")}
      </Button>
      <Button type="button" variant="outline" size="sm" className="gap-1" disabled={pending} onClick={() => start(() => answerPartnerAction(requestId, "declined"))}>
        <X className="size-4" /> {t("decline")}
      </Button>
    </div>
  );
}
