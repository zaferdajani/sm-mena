import { Gavel, Link2, XCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { acceptDecisionAction, answerCancelAction } from "@/app/[locale]/(main)/contract-actions";
import { SubmitButton } from "@/components/submit-button";
import { canAppeal, isHeld } from "@/lib/contracts/rules";
import type { ContractView, DisputeView } from "@/lib/data/contracts";
import { formatDate, formatFils } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AppealForm, EvidenceForm, OpenDisputeForm, PlainCancelForm, ProposeCancelForm } from "./dispute-forms";

type Side = "agency" | "client";

const Hidden = ({ values }: { values: Record<string, string> }) => (
  <>
    {Object.entries(values).map(([k, v]) => (
      <input key={k} type="hidden" name={k} value={v} />
    ))}
  </>
);

/**
 * Everything about problems on a contract, for either side: milestone
 * disputes (statement, evidence, decision, one appeal), mutual cancellation
 * while money is held, and the plain cancel while nothing is.
 */
export async function ProblemPanel({ v, side, hidden, locale }: { v: ContractView; side: Side; hidden: Record<string, string>; locale: string }) {
  const t = await getTranslations("Contracts");
  const c = v.contract;
  const money = (f: number) => formatFils(f, locale, c.currency);
  const held = v.milestones
    .filter((m) => c.paymentMode === "protected" && isHeld(m.status) && (v.heldBy[m.id] ?? 0) > 0)
    .map((m) => ({ id: m.id, title: m.title, held: money(v.heldBy[m.id] ?? 0), heldAmount: v.heldBy[m.id] ?? 0 }));
  const disputed = new Set(v.disputes.filter((d) => ["open", "decided", "appealed"].includes(d.status)).map((d) => d.milestoneId));
  const disputable = held.filter((m) => !disputed.has(m.id));
  const pending = v.cancellations.find((p) => p.status === "pending");
  const lastDeclined = v.cancellations[0]?.status === "declined" ? v.cancellations[0] : null;
  const canDispute = c.status === "active" || (c.status === "disputed" && disputable.length > 0);
  const canPlainCancel = side === "agency" && ["sent", "active"].includes(c.status) && v.money.held === 0 && !held.length;
  const canProposeCancel = c.status === "active" && held.length > 0 && !pending;

  return (
    <div className="space-y-3">
      {v.disputes.length > 0 && (
        <section className="space-y-3" data-testid="disputes">
          <h2 className="flex items-center gap-2 font-semibold">
            <Gavel className="size-4 text-destructive" /> {t("dispute.title")}
          </h2>
          {v.disputes.map((d) => (
            <DisputeCard key={d.id} d={d} v={v} side={side} hidden={hidden} locale={locale} />
          ))}
        </section>
      )}

      {pending && (
        <section className="space-y-2 rounded-2xl border-2 border-amber-500/40 p-4 text-sm" data-testid="cancel-pending">
          <p className="flex items-center gap-2 font-semibold">
            <XCircle className="size-4 text-amber-600" /> {t("cancelMutual.proposedBy", { side: t(`dispute.sides.${pending.proposedBy as Side}`) })}
          </p>
          <ul className="list-disc space-y-0.5 ps-5 text-muted-foreground">
            {pending.splits.map((s) => (
              <li key={s.milestoneId} dir="auto">
                {t("cancelMutual.line", { milestone: v.milestones.find((m) => m.id === s.milestoneId)?.title ?? "", release: money(s.releaseFils), refund: money(s.refundFils) })}
              </li>
            ))}
          </ul>
          {pending.note && <p dir="auto">{pending.note}</p>}
          {pending.proposedBy === side ? (
            <form action={answerCancelAction} className="flex flex-wrap items-center gap-2">
              <Hidden values={{ ...hidden, proposalId: pending.id, answer: "withdraw" }} />
              <span className="text-xs text-muted-foreground">{t("cancelMutual.waiting")}</span>
              <SubmitButton variant="outline" className="h-8">{t("cancelMutual.withdraw")}</SubmitButton>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <form action={answerCancelAction}>
                <Hidden values={{ ...hidden, proposalId: pending.id, answer: "accept" }} />
                <SubmitButton variant="destructive" className="h-9">{t("cancelMutual.accept")}</SubmitButton>
              </form>
              <form action={answerCancelAction}>
                <Hidden values={{ ...hidden, proposalId: pending.id, answer: "decline" }} />
                <SubmitButton variant="outline" className="h-9">{t("cancelMutual.decline")}</SubmitButton>
              </form>
            </div>
          )}
        </section>
      )}
      {!pending && lastDeclined && c.status === "active" && <p className="rounded-xl bg-muted p-3 text-sm" data-testid="cancel-declined">{t("cancelMutual.declined")}</p>}

      {(canDispute || canPlainCancel || canProposeCancel) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {canDispute && <OpenDisputeForm perspective={side} hidden={hidden} held={disputable} />}
          {canPlainCancel && <PlainCancelForm hidden={hidden} />}
          {canProposeCancel && <ProposeCancelForm hidden={hidden} held={held} currency={c.currency} />}
        </div>
      )}
    </div>
  );
}

async function DisputeCard({ d, v, side, hidden, locale }: { d: DisputeView; v: ContractView; side: Side; hidden: Record<string, string>; locale: string }) {
  const t = await getTranslations("Contracts.dispute");
  const money = (f: number) => formatFils(f, locale, v.contract.currency);
  const title = v.milestones.find((m) => m.id === d.milestoneId)?.title ?? "";
  const live = ["open", "decided", "appealed"].includes(d.status);
  const decisionText = (x: { decision: string | null; releaseFils: number | null; refundFils: number | null }) =>
    x.decision === "release"
      ? t("release", { amount: money(x.releaseFils ?? 0) })
      : x.decision === "refund"
        ? t("refund", { amount: money(x.refundFils ?? 0) })
        : t("split", { release: money(x.releaseFils ?? 0), refund: money(x.refundFils ?? 0) });
  const mine = side === "agency" ? d.agencyAcceptedAt : d.clientAcceptedAt;
  const theirs = side === "agency" ? d.clientAcceptedAt : d.agencyAcceptedAt;
  return (
    <article className={cn("space-y-3 rounded-2xl border p-4 text-sm", live ? "border-destructive/40" : "opacity-90")} data-testid="dispute-card" data-status={d.status}>
      <div className="flex flex-wrap items-center gap-2">
        <b dir="auto">{t("on", { milestone: title })}</b>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]" data-testid="dispute-state">{t(`state.${d.status}`)}</span>
      </div>
      <p className="text-xs text-muted-foreground">{t("openedBy", { side: t(`sides.${d.openedBy as Side}`), date: formatDate(d.createdAt, locale) })}</p>
      <p className="whitespace-pre-line rounded-lg bg-muted/60 p-2" dir="auto">{d.statement}</p>

      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold">{t("evidence")}</h3>
        {!d.evidence.length && <p className="text-xs text-muted-foreground">{t("noEvidence")}</p>}
        <ul className="space-y-1.5" data-testid="evidence-list">
          {d.evidence.map((e) => (
            <li key={e.id} className={cn("rounded-lg border p-2", e.side === side && "bg-brand/5")}>
              <p className="text-[11px] text-muted-foreground">
                {t(`sides.${e.side as Side}`)} · {formatDate(e.createdAt, locale)}
              </p>
              <p className="whitespace-pre-line" dir="auto">{e.body}</p>
              {e.links.map((l) => (
                <a key={l} href={l} target="_blank" rel="noopener noreferrer nofollow" className="mt-0.5 flex items-center gap-1 truncate text-xs text-brand hover:underline" dir="ltr">
                  <Link2 className="size-3 shrink-0" /> {l}
                </a>
              ))}
            </li>
          ))}
        </ul>
        {live && <EvidenceForm hidden={hidden} disputeId={d.id} />}
      </div>

      {d.firstDecision && (
        <div className="rounded-lg border p-2 text-xs text-muted-foreground">
          <p className="font-semibold">{t("firstDecision")}</p>
          <p>{decisionText({ decision: d.firstDecision.decision, releaseFils: d.firstDecision.releaseFils, refundFils: d.firstDecision.refundFils })}</p>
          <p dir="auto">{t("reason", { reason: d.firstDecision.reason })}</p>
        </div>
      )}
      {d.appealNote && <p className="rounded-lg bg-amber-500/10 p-2 text-xs" dir="auto">{t("appealed", { side: t(`sides.${d.appealedBy as Side}`), note: d.appealNote })}</p>}
      {d.status === "appealed" && <p className="text-xs text-muted-foreground">{t("appealReview")}</p>}

      {d.decision && d.status !== "closed" && d.status !== "appealed" && (
        <div className="space-y-1 rounded-lg bg-brand/5 p-3" data-testid="dispute-decision">
          <p className="font-semibold">{d.status === "final" ? t("finalDecision") : t("decision")}</p>
          <p>{decisionText(d)}</p>
          <p className="text-muted-foreground" dir="auto">{t("reason", { reason: d.reason ?? "" })}</p>
          {d.status === "decided" && d.appealDeadline && <p className="text-xs">{t("appealUntil", { date: formatDate(d.appealDeadline, locale) })}</p>}
          {d.status === "decided" && theirs && <p className="text-xs text-muted-foreground">{t("otherAccepted")}</p>}
        </div>
      )}
      {d.status === "closed" && d.reason && <p className="text-xs text-muted-foreground" dir="auto">{t("closedNote", { reason: d.reason })}</p>}

      {d.status === "decided" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {canAppeal(d) && <AppealForm hidden={hidden} disputeId={d.id} />}
          {mine ? (
            <p className="text-xs text-muted-foreground">{t("accepted")}</p>
          ) : (
            <form action={acceptDecisionAction}>
              <Hidden values={{ ...hidden, disputeId: d.id }} />
              <SubmitButton variant="outline" className="h-9">{t("accept")}</SubmitButton>
            </form>
          )}
        </div>
      )}
    </article>
  );
}
