"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { decideDisputeAction } from "@/app/[locale]/(main)/admin/contract-actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Admin decision on one milestone dispute: release all, refund all, or split
 * (the two parts must add up to what is held), with written reasons. `final`
 * after an appeal.
 */
export function DisputeDecisionForm({ disputeId, heldFils, heldLabel, currency, final }: { disputeId: string; heldFils: number; heldLabel: string; currency: string; final: boolean }) {
  const t = useTranslations("Contracts.admin");
  const [state, action] = useActionState(decideDisputeAction, undefined);
  // Nothing is chosen at first: a decision moves money, so the admin picks it (never a pre-filled 50/50).
  const [decision, setDecision] = useState<"release" | "refund" | "split" | null>(null);
  const [release, setRelease] = useState("");
  const [refund, setRefund] = useState("");
  const held = heldFils / 1000;
  const parts = decision === "release" ? [held, 0] : decision === "refund" ? [0, held] : [Number(release || 0), Number(refund || 0)];
  const err = state?.error;
  if (state?.ok) return <p className="rounded-lg bg-brand/10 p-2 text-xs" role="status">{t("decided")}</p>;
  return (
    <form
      action={action}
      className="space-y-2 rounded-xl bg-muted/50 p-3"
      data-testid="decision-form"
      onSubmit={(e) => {
        // A last look at who gets what before the money moves.
        if (!window.confirm(t("confirm", { agency: `${parts[0]} ${currency}`, client: `${parts[1]} ${currency}` }))) e.preventDefault();
      }}
    >
      <input type="hidden" name="disputeId" value={disputeId} />
      <input type="hidden" name="held" value={heldFils} />
      <p className="text-xs font-semibold">
        {t("decide")} · {t("held", { amount: heldLabel })}
      </p>
      <div className="flex flex-wrap gap-3 text-xs">
        {(["release", "refund", "split"] as const).map((d) => (
          <label key={d} className="flex items-center gap-1">
            <input type="radio" name="decision" value={d} required checked={decision === d} onChange={() => setDecision(d)} className="accent-[var(--brand)]" data-testid={`decision-${d}`} />
            {t(d === "release" ? "optRelease" : d === "refund" ? "optRefund" : "optSplit")}
          </label>
        ))}
      </div>
      {decision === "split" && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="grid gap-1">
            {t("toAgency")} ({currency})
            <Input name="release" type="number" min={0} step="0.001" required value={release} onChange={(e) => { setRelease(e.target.value); setRefund(String(Math.max(0, Math.round(heldFils - Number(e.target.value || 0) * 1000)) / 1000)); }} dir="ltr" data-testid="split-release" />
          </label>
          <label className="grid gap-1">
            {t("toClient")} ({currency})
            <Input name="refund" type="number" min={0} step="0.001" required value={refund} onChange={(e) => setRefund(e.target.value)} dir="ltr" data-testid="split-refund" />
          </label>
        </div>
      )}
      <Textarea name="reason" required minLength={10} maxLength={4000} rows={3} placeholder={t("reasonPh")} dir="auto" data-testid="decision-reason" />
      <FormError message={err ? t(`errors.${["sum", "reason", "locked"].includes(err) ? (err as "sum") : "invalid"}`) : undefined} />
      <SubmitButton variant={final ? "destructive" : "default"} className="h-9" disabled={!decision}>{final ? t("submitFinal") : t("submitFirst")}</SubmitButton>
    </form>
  );
}
