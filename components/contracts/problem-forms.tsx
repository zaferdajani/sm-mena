"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { agencyCancelAction, agencyDisputeAction, clientDisputeAction } from "@/app/[locale]/(main)/contract-actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** "Report a problem" (opens a dispute) and, for agencies, "Cancel contract". */
export function ProblemForms({ perspective, hidden, canCancel, canDispute }: { perspective: "agency" | "client"; hidden: Record<string, string>; canCancel: boolean; canDispute: boolean }) {
  const t = useTranslations("Contracts");
  const [dState, dispute] = useActionState(perspective === "agency" ? agencyDisputeAction : clientDisputeAction, undefined);
  const [cState, cancel] = useActionState(agencyCancelAction, undefined);
  const hiddenInputs = Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />);
  if (!canCancel && !canDispute) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {canDispute && (
        <details className="rounded-2xl border p-4">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <AlertTriangle className="size-4 text-amber-600" /> {t("dispute.open")}
          </summary>
          <form action={dispute} className="mt-3 space-y-2">
            {hiddenInputs}
            <p className="text-xs text-muted-foreground">{t("dispute.hint")}</p>
            <Textarea name="note" required minLength={5} placeholder={t("dispute.note")} rows={3} dir="auto" />
            <FormError message={dState?.error ? t(`ms.errors.${dState.error}` as "ms.errors.note") : undefined} />
            <SubmitButton variant="outline">{t("dispute.send")}</SubmitButton>
          </form>
        </details>
      )}
      {canCancel && perspective === "agency" && (
        <details className="rounded-2xl border p-4">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">{t("cancel.button")}</summary>
          <form action={cancel} className="mt-3 space-y-2">
            {hiddenInputs}
            <Input name="reason" placeholder={t("cancel.reason")} dir="auto" />
            <FormError message={cState?.error === "moneyHeld" ? t("cancel.moneyHeld") : cState?.error ? t("ms.errors.locked") : undefined} />
            <SubmitButton variant="destructive">{t("cancel.confirm")}</SubmitButton>
          </form>
        </details>
      )}
    </div>
  );
}
