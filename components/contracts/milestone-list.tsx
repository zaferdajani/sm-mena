"use client";

import { CheckCircle2, Circle, CircleDashed, Lock, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useOptimistic, useTransition } from "react";
import {
  agencyReceivedAction,
  agencySubmitAction,
  agencyTickAction,
  clientApproveAction,
  clientChangesAction,
  clientFundAction,
  clientPaidDirectAction,
  clientTickAction,
} from "@/app/[locale]/(main)/contract-actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { Milestone, MilestoneCheck } from "@/lib/db/schema";
import { formatFils } from "@/lib/format";
import { cn } from "@/lib/utils";

type Ms = Milestone & { checks: MilestoneCheck[] };
type Props = {
  perspective: "agency" | "client";
  milestones: Ms[];
  mode: "protected" | "direct";
  active: boolean;
  fundableId: string | null;
  hidden: Record<string, string>; // contractId (agency) or token (client)
  currency?: string;
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  funded: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  submitted: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  changes_requested: "bg-destructive/10 text-destructive",
  approved: "bg-brand/10 text-brand",
  released: "bg-brand/10 text-brand",
  refunded: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

function Hidden({ values }: { values: Record<string, string> }) {
  return (
    <>
      {Object.entries(values).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </>
  );
}

function Checklist({ m, perspective, editable, hidden }: { m: Ms; perspective: "agency" | "client"; editable: boolean; hidden: Record<string, string> }) {
  const t = useTranslations("Contracts.ms");
  const field = perspective === "agency" ? "doneByAgency" : "confirmedByClient";
  const [items, setOptimistic] = useOptimistic(m.checks, (state, { id, value }: { id: string; value: boolean }) => state.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  const [, start] = useTransition();
  const toggle = (c: MilestoneCheck, value: boolean) =>
    start(async () => {
      setOptimistic({ id: c.id, value });
      const fd = new FormData();
      Object.entries(hidden).forEach(([k, v]) => fd.set(k, v));
      fd.set("milestoneId", m.id);
      fd.set("checkId", c.id);
      fd.set("value", value ? "1" : "0");
      await (perspective === "agency" ? agencyTickAction(fd) : clientTickAction(fd));
    });
  return (
    <ul className="space-y-1.5" data-testid="checklist">
      {items.map((c) => {
        const mine = c[field];
        return (
          <li key={c.id} className="flex items-start gap-2 text-sm">
            {editable ? (
              <input type="checkbox" checked={mine} onChange={(e) => toggle(c, e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" aria-label={c.text} />
            ) : c.confirmedByClient ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
            ) : c.doneByAgency ? (
              <CircleDashed className="mt-0.5 size-4 shrink-0 text-amber-600" />
            ) : (
              <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="flex-1" dir="auto">
              {c.source === "special_request" && (
                <span className="me-1 inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1 text-[11px] text-amber-700 dark:text-amber-400">
                  <Star className="size-3" /> {t("special")}
                </span>
              )}
              {c.text}
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {c.doneByAgency && t("agencyTick")}
              {c.doneByAgency && c.confirmedByClient && " · "}
              {c.confirmedByClient && t("clientTick")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function AgencyActions({ m, mode, hidden }: { m: Ms; mode: Props["mode"]; hidden: Record<string, string> }) {
  const t = useTranslations("Contracts.ms");
  const [state, action] = useActionState(agencySubmitAction, undefined);
  const canSubmit = mode === "protected" ? ["funded", "changes_requested"].includes(m.status) : ["pending", "changes_requested"].includes(m.status);
  return (
    <div className="space-y-2">
      {mode === "protected" && m.status === "pending" && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="size-3.5" /> {t("needsFunding")}
        </p>
      )}
      {canSubmit && (
        <form action={action} className="space-y-2">
          <Hidden values={{ ...hidden, milestoneId: m.id }} />
          <Textarea name="note" placeholder={t("submitNote")} rows={2} dir="auto" />
          <FormError message={state?.error ? t(`errors.${state.error}` as "errors.locked") : undefined} />
          <SubmitButton className="h-9" >{t("submit")}</SubmitButton>
        </form>
      )}
      {mode === "direct" && ["submitted", "approved"].includes(m.status) && !m.agencyConfirmedPaid && (
        <form action={agencyReceivedAction}>
          <Hidden values={{ ...hidden, milestoneId: m.id }} />
          <SubmitButton variant="outline" className="h-9">{t("receivedDirect")}</SubmitButton>
        </form>
      )}
    </div>
  );
}

function ClientActions({ m, mode, fundable, hidden, currency }: { m: Ms; mode: Props["mode"]; fundable: boolean; hidden: Record<string, string>; currency?: string }) {
  const t = useTranslations("Contracts.ms");
  const locale = useLocale();
  const [approveState, approve] = useActionState(clientApproveAction, undefined);
  const [changesState, changes] = useActionState(clientChangesAction, undefined);
  const amount = formatFils(m.amountFils, locale, currency);
  return (
    <div className="space-y-2">
      {fundable && (
        <form action={clientFundAction} className="space-y-1">
          <Hidden values={{ ...hidden, milestoneId: m.id }} />
          <SubmitButton className="h-10 w-full sm:w-auto">{t("fund", { amount })}</SubmitButton>
          <p className="text-xs text-muted-foreground">{t("fundHint")}</p>
        </form>
      )}
      {m.status === "submitted" && (
        <>
          <p className="text-xs text-muted-foreground">{t("confirmAll")}</p>
          <form action={approve}>
            <Hidden values={{ ...hidden, milestoneId: m.id }} />
            <FormError message={approveState?.error ? t(`errors.${approveState.error}` as "errors.locked") : undefined} />
            <SubmitButton className="h-10">{mode === "protected" ? t("approveRelease", { amount }) : t("approve")}</SubmitButton>
          </form>
          <details>
            <summary className="cursor-pointer text-sm text-muted-foreground">{t("requestChanges")}</summary>
            <form action={changes} className="mt-2 space-y-2">
              <Hidden values={{ ...hidden, milestoneId: m.id }} />
              <Textarea name="note" required minLength={3} placeholder={t("changesPh")} rows={2} dir="auto" />
              <FormError message={changesState?.error ? t(`errors.${changesState.error}` as "errors.locked") : undefined} />
              <SubmitButton variant="outline" className="h-9">{t("requestChanges")}</SubmitButton>
            </form>
          </details>
        </>
      )}
      {mode === "direct" && !m.clientPaidDirect && !["cancelled", "pending"].includes(m.status) && (
        <form action={clientPaidDirectAction}>
          <Hidden values={{ ...hidden, milestoneId: m.id }} />
          <SubmitButton variant="outline" className="h-9">{t("paidDirect")}</SubmitButton>
        </form>
      )}
    </div>
  );
}

export function MilestoneList({ perspective, milestones, mode, active, fundableId, hidden, currency }: Props) {
  const t = useTranslations("Contracts.ms");
  const locale = useLocale();
  const date = (d: string) => new Intl.DateTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en-GB", { day: "numeric", month: "short" }).format(new Date(`${d}T12:00:00Z`));
  return (
    <ol className="relative space-y-3 border-s-2 border-border ps-4" data-testid="milestones">
      {milestones.map((m, i) => {
        const editable =
          active &&
          (perspective === "agency" ? (mode === "protected" ? ["pending", "funded", "changes_requested"] : ["pending", "changes_requested"]).includes(m.status) : m.status === "submitted");
        return (
          <li key={m.id} className="relative space-y-3 rounded-2xl border bg-card p-4" data-testid="milestone" data-status={m.status}>
            <span className={cn("absolute -start-[1.4rem] top-5 size-3 rounded-full ring-4 ring-background", ["approved", "released"].includes(m.status) ? "bg-brand" : "bg-border")} />
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold" dir="auto">
                {i + 1}. {m.title}
              </span>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_STYLE[m.status])}>{t(`status.${m.status}`)}</span>
              <span className="ms-auto text-sm font-semibold tabular-nums">{formatFils(m.amountFils, locale, currency)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("due", { date: date(m.dueDate) })}
              {m.clientPaidDirect && ` · ${t("paidDirectDone")}`}
              {m.agencyConfirmedPaid && ` · ${t("receivedDone")}`}
            </p>
            {m.status === "changes_requested" && m.changesNote && <p className="rounded-lg bg-destructive/10 p-2 text-sm" dir="auto">{t("changes", { note: m.changesNote })}</p>}
            {m.submissionNote && ["submitted", "approved", "released"].includes(m.status) && <p className="rounded-lg bg-muted p-2 text-sm whitespace-pre-line" dir="auto">{t("delivered", { note: m.submissionNote })}</p>}
            <Checklist m={m} perspective={perspective} editable={editable} hidden={hidden} />
            {active &&
              (perspective === "agency" ? (
                <AgencyActions m={m} mode={mode} hidden={hidden} />
              ) : (
                <ClientActions m={m} mode={mode} fundable={fundableId === m.id} hidden={hidden} currency={currency} />
              ))}
          </li>
        );
      })}
    </ol>
  );
}
