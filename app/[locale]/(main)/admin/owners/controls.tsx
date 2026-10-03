"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { computeOwnerMatchesAction, sendOwnerMatchEmailsAction, type OwnerAdminState } from "@/app/[locale]/(main)/admin/owner-actions";
import { SubmitButton } from "@/components/submit-button";

export function OwnerAdminControls({ sendOpen }: { sendOpen: boolean }) {
  const t = useTranslations("AdminOwners");
  const [computed, compute] = useActionState<OwnerAdminState, FormData>(async () => computeOwnerMatchesAction(), undefined);
  const [sent, send] = useActionState<OwnerAdminState, FormData>(async () => sendOwnerMatchEmailsAction(), undefined);
  return (
    <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
      <form action={compute} className="grid gap-2">
        <p className="text-sm font-semibold">{t("compute.title")}</p>
        <p className="text-xs text-muted-foreground">{t("compute.body")}</p>
        <SubmitButton testId="owners-compute">{t("compute.button")}</SubmitButton>
        {computed?.computed && <p className="text-xs" data-testid="owners-computed">{t("compute.result", computed.computed)}</p>}
      </form>
      <form action={send} className="grid gap-2">
        <p className="text-sm font-semibold">{t("send.title")}</p>
        <p className="text-xs text-muted-foreground">{sendOpen ? t("send.bodyOpen") : t("send.bodyClosed")}</p>
        <SubmitButton testId="owners-send" disabled={!sendOpen}>{t("send.button")}</SubmitButton>
        {sent?.sent && <p className="text-xs" data-testid="owners-sent">{sent.sent.skipped === "closed" ? t("send.skipped") : t("send.result", { attempted: sent.sent.attempted, sent: sent.sent.sent })}</p>}
      </form>
    </div>
  );
}
