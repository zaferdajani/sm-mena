"use client";

import { AlertTriangle, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  agencyCancelAction,
  agencyDisputeAction,
  appealAction,
  clientDisputeAction,
  evidenceAction,
  proposeCancelAction,
} from "@/app/[locale]/(main)/contract-actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const Hidden = ({ values }: { values: Record<string, string> }) => (
  <>
    {Object.entries(values).map(([k, v]) => (
      <input key={k} type="hidden" name={k} value={v} />
    ))}
  </>
);

type Held = { id: string; title: string; held: string; heldAmount: number };

/** "Report a problem": a dispute on one milestone whose money is held (or on the contract when none is). */
export function OpenDisputeForm({ perspective, hidden, held }: { perspective: "agency" | "client"; hidden: Record<string, string>; held: Held[] }) {
  const t = useTranslations("Contracts");
  const [state, action] = useActionState(perspective === "agency" ? agencyDisputeAction : clientDisputeAction, undefined);
  const err = state?.error;
  return (
    <details className="rounded-2xl border p-4" data-testid="open-dispute">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <AlertTriangle className="size-4 text-amber-600" /> {t("dispute.open")}
      </summary>
      <form action={action} className="mt-3 space-y-2">
        <Hidden values={hidden} />
        <p className="text-xs text-muted-foreground">{t("dispute.hint")}</p>
        {held.length ? (
          <label className="grid gap-1 text-sm">
            {t("dispute.milestone")}
            <select name="milestoneId" className="h-10 rounded-md border bg-background px-2" data-testid="dispute-milestone" defaultValue={held[0].id}>
              {held.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} · {m.held}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-xs text-muted-foreground">{t("dispute.noHeld")}</p>
        )}
        <Textarea name="note" required minLength={5} maxLength={4000} placeholder={t("dispute.note")} rows={3} dir="auto" />
        <FormError message={err ? (["exists", "notHeld", "note", "locked"].includes(err) ? t(`dispute.errors.${err as "exists"}`) : t("ms.errors.locked")) : undefined} />
        <SubmitButton variant="outline">{t("dispute.send")}</SubmitButton>
      </form>
    </details>
  );
}

/** Agency only, while nothing is held: cancel the rest of the contract. */
export function PlainCancelForm({ hidden }: { hidden: Record<string, string> }) {
  const t = useTranslations("Contracts");
  const [state, action] = useActionState(agencyCancelAction, undefined);
  return (
    <details className="rounded-2xl border p-4">
      <summary className="cursor-pointer text-sm font-medium text-muted-foreground">{t("cancel.button")}</summary>
      <form action={action} className="mt-3 space-y-2">
        <Hidden values={hidden} />
        <Input name="reason" placeholder={t("cancel.reason")} dir="auto" />
        <FormError message={state?.error === "moneyHeld" ? t("cancel.moneyHeld") : state?.error ? t("ms.errors.locked") : undefined} />
        <SubmitButton variant="destructive">{t("cancel.confirm")}</SubmitButton>
      </form>
    </details>
  );
}

/** Mutual cancellation while money is held: how much of each held milestone goes to the agency. */
export function ProposeCancelForm({ hidden, held, currency }: { hidden: Record<string, string>; held: Held[]; currency: string }) {
  const t = useTranslations("Contracts.cancelMutual");
  const [state, action] = useActionState(proposeCancelAction, undefined);
  const err = state?.error;
  return (
    <details className="rounded-2xl border p-4" data-testid="propose-cancel">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground">
        <XCircle className="size-4" /> {t("title")}
      </summary>
      {state?.ok ? null : (
        <form action={action} className="mt-3 space-y-3">
          <Hidden values={hidden} />
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
          {held.map((m) => (
            <label key={m.id} className="grid gap-1 text-sm">
              <span dir="auto">{t("releaseFor", { milestone: m.title, held: m.held })}</span>
              <span className="flex items-center gap-2">
                <Input name={`release_${m.id}`} type="number" min={0} max={m.heldAmount / 1000} step="0.001" defaultValue={0} className="w-40" dir="ltr" />
                <span className="text-xs text-muted-foreground">{currency}</span>
              </span>
            </label>
          ))}
          <Input name="note" placeholder={t("note")} maxLength={1000} dir="auto" />
          <FormError message={err ? (["split", "exists", "nothingHeld", "stale"].includes(err) ? t(`errors.${err as "split"}`) : t("errors.split")) : undefined} />
          <SubmitButton variant="outline">{t("propose")}</SubmitButton>
        </form>
      )}
    </details>
  );
}

export function EvidenceForm({ hidden, disputeId }: { hidden: Record<string, string>; disputeId: string }) {
  const t = useTranslations("Contracts.dispute");
  const [state, action] = useActionState(evidenceAction, undefined);
  return (
    <details className="rounded-xl border p-3" data-testid="evidence-form">
      <summary className="cursor-pointer text-sm font-medium">{t("addEvidence")}</summary>
      <form action={action} className="mt-2 space-y-2">
        <Hidden values={{ ...hidden, disputeId }} />
        <Textarea name="body" required minLength={3} maxLength={4000} rows={3} placeholder={t("evidencePh")} dir="auto" />
        <Textarea name="links" rows={2} maxLength={3000} placeholder={t("linksPh")} dir="ltr" />
        <FormError message={state?.error ? t(`errors.${["tooMany", "note", "locked"].includes(state.error) ? (state.error as "note") : "locked"}`) : undefined} />
        <SubmitButton variant="outline" className="h-9">{t("sendEvidence")}</SubmitButton>
      </form>
    </details>
  );
}

export function AppealForm({ hidden, disputeId }: { hidden: Record<string, string>; disputeId: string }) {
  const t = useTranslations("Contracts.dispute");
  const [state, action] = useActionState(appealAction, undefined);
  return (
    <details className="rounded-xl border p-3" data-testid="appeal-form">
      <summary className="cursor-pointer text-sm font-medium">{t("appeal")}</summary>
      <form action={action} className="mt-2 space-y-2">
        <Hidden values={{ ...hidden, disputeId }} />
        <Textarea name="note" required minLength={10} maxLength={4000} rows={3} placeholder={t("appealPh")} dir="auto" />
        <FormError message={state?.error ? t(`errors.${state.error === "note" ? "note" : "locked"}`) : undefined} />
        <SubmitButton variant="outline" className="h-9">{t("appealSend")}</SubmitButton>
      </form>
    </details>
  );
}
