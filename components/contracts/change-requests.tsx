"use client";

import { FilePlus2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { agencyChangeAction, agencyUpdateAction, agencyWithdrawChangeAction, clientDecideChangeAction } from "@/app/[locale]/(main)/contract-actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Change = { id: string; title: string; reason: string; amount: string; dueDate: string; checks: string[]; status: string; decidedBy: string | null };

const Hidden = ({ values }: { values: Record<string, string> }) => (
  <>
    {Object.entries(values).map(([k, v]) => (
      <input key={k} type="hidden" name={k} value={v} />
    ))}
  </>
);

/**
 * Extra work or money after signing. The agency can only ask; the client
 * accepts (with their typed name) or declines. Accepted changes become a new
 * milestone with its own checklist and amount.
 */
export function ChangeRequests({ perspective, hidden, changes, active }: { perspective: "agency" | "client"; hidden: Record<string, string>; changes: Change[]; active: boolean }) {
  const t = useTranslations("Contracts.changes");
  const pending = changes.filter((c) => c.status === "pending");
  const past = changes.filter((c) => c.status !== "pending");
  if (perspective === "client" && !changes.length) return null;
  return (
    <section className="space-y-3" data-testid="change-requests">
      <h2 className="font-semibold">{t("title")}</h2>
      {perspective === "client" && pending.length > 0 && <p className="text-sm text-muted-foreground">{t("clientHint")}</p>}
      <ul className="space-y-2">
        {pending.map((c) => (
          <li key={c.id} className="space-y-2 rounded-xl border-2 border-amber-500/40 p-3 text-sm" data-testid="change-pending">
            <ChangeBody change={c} />
            {perspective === "client" ? <DecideForm hidden={{ ...hidden, changeId: c.id }} /> : <WithdrawForm hidden={{ ...hidden, changeId: c.id }} />}
          </li>
        ))}
        {past.map((c) => (
          <li key={c.id} className="space-y-1 rounded-xl border p-3 text-sm opacity-80">
            <ChangeBody change={c} />
            <p className="text-xs font-medium">
              {t(`status.${c.status as "accepted"}`)}
              {c.decidedBy ? ` · ${c.decidedBy}` : ""}
            </p>
          </li>
        ))}
      </ul>
      {perspective === "agency" && active && <RequestForm hidden={hidden} />}
    </section>
  );
}

function ChangeBody({ change }: { change: Change }) {
  const t = useTranslations("Contracts.changes");
  return (
    <>
      <p className="flex flex-wrap justify-between gap-2 font-medium">
        <span dir="auto">{change.title}</span>
        <span className="tabular-nums">{change.amount} · {change.dueDate}</span>
      </p>
      <p className="text-muted-foreground" dir="auto">{t("why")}: {change.reason}</p>
      <ul className="list-disc ps-5 text-muted-foreground">
        {change.checks.map((k, i) => (
          <li key={i} dir="auto">{k}</li>
        ))}
      </ul>
    </>
  );
}

function DecideForm({ hidden }: { hidden: Record<string, string> }) {
  const t = useTranslations("Contracts.changes");
  const [state, action] = useActionState(clientDecideChangeAction, undefined);
  return (
    <form action={action} className="space-y-2 border-t pt-2">
      <Hidden values={hidden} />
      <Input name="signer" placeholder={t("signer")} className="font-serif italic" dir="auto" />
      <div className="flex flex-wrap gap-2">
        <button type="submit" name="decision" value="accept" className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">{t("accept")}</button>
        <button type="submit" name="decision" value="decline" className="h-9 rounded-md border px-3 text-sm hover:bg-muted">{t("decline")}</button>
      </div>
      <FormError message={state?.error ? t(`errors.${state.error === "signer" ? "signer" : "generic"}`) : undefined} />
    </form>
  );
}

function WithdrawForm({ hidden }: { hidden: Record<string, string> }) {
  const t = useTranslations("Contracts.changes");
  return (
    <form action={agencyWithdrawChangeAction} className="border-t pt-2">
      <Hidden values={hidden} />
      <p className="mb-1 text-xs text-muted-foreground">{t("waiting")}</p>
      <button type="submit" className="rounded-md border px-3 py-1 text-xs hover:bg-muted">{t("withdraw")}</button>
    </form>
  );
}

function RequestForm({ hidden }: { hidden: Record<string, string> }) {
  const t = useTranslations("Contracts.changes");
  const [state, action] = useActionState(agencyChangeAction, undefined);
  return (
    <details className="rounded-xl border p-3">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <FilePlus2 className="size-4 text-brand" /> {t("request")}
      </summary>
      <form action={action} className="mt-3 grid gap-2 text-sm">
        <Hidden values={hidden} />
        <p className="text-xs text-muted-foreground">{t("agencyHint")}</p>
        <Input name="title" required minLength={3} maxLength={120} placeholder={t("titlePh")} dir="auto" />
        <Textarea name="reason" required minLength={5} maxLength={1000} rows={2} placeholder={t("reasonPh")} dir="auto" />
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-xs text-muted-foreground">
            {t("amount")}
            <Input name="amount" type="number" min={0} step="0.001" required dir="ltr" />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            {t("due")}
            <Input name="dueDate" type="date" required dir="ltr" />
          </label>
        </div>
        <Textarea name="checks" required rows={3} placeholder={t("checksPh")} dir="auto" />
        <FormError message={state?.error ? t(`errors.${["note", "amounts", "milestoneDate", "emptyChecklist", "tooMany"].includes(state.error) ? state.error : "generic"}` as "errors.generic") : undefined} />
        {state?.ok && <p className="text-xs text-brand">{t("sent")}</p>}
        <SubmitButton className="h-9 justify-self-start">{t("send")}</SubmitButton>
      </form>
    </details>
  );
}

/** The agency's progress update form (what was done, numbers against the targets, what's next). */
export function UpdateForm({ hidden }: { hidden: Record<string, string> }) {
  const t = useTranslations("Contracts.updates");
  const [state, action] = useActionState(agencyUpdateAction, undefined);
  return (
    <form action={action} className="grid gap-2 rounded-xl border p-3 text-sm" data-testid="update-form">
      <Hidden values={hidden} />
      <label className="font-medium" htmlFor="update-text">{t("post")}</label>
      <Textarea id="update-text" name="text" required minLength={10} maxLength={2000} rows={4} placeholder={t("placeholder")} dir="auto" />
      <FormError message={state?.error ? t("error") : undefined} />
      {state?.ok && <p className="text-xs text-brand">{t("posted")}</p>}
      <SubmitButton className="h-9 justify-self-start">{t("send")}</SubmitButton>
    </form>
  );
}
