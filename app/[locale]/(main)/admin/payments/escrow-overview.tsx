import { CheckCircle2, Circle, CircleDashed, FlaskConical, Link2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DisputeDecisionForm } from "@/components/admin/dispute-decision-form";
import { StatTiles } from "@/components/admin/stat-tiles";
import { isHeld } from "@/lib/contracts/rules";
import { escrowOverview } from "@/lib/data/contracts";
import { formatDate, formatFils } from "@/lib/format";
import { closeDisputeAction, resolveMilestoneAction } from "../contract-actions";

// Protected client payments: money held for milestones, payouts, refunds, fees
// and disputes — each with its timeline, both sides' evidence, the checklists,
// and the decision (release, refund or split; one appeal, then final).
export async function EscrowOverview({ locale }: { locale: string }) {
  const t = await getTranslations("Contracts");
  const ta = await getTranslations("AdminPayments");
  const o = await escrowOverview();
  const money = (f: number, currency?: string) => formatFils(f, locale, currency);
  return (
    <div className="space-y-5" data-testid="escrow-overview">
      <StatTiles
        locale={locale}
        tiles={[
          { label: t("admin.tiles.held"), value: money(o.held) },
          { label: t("admin.tiles.deposited"), value: money(o.deposited) },
          { label: t("admin.tiles.released"), value: money(o.released) },
          { label: t("admin.tiles.refunded"), value: money(o.refunded) },
          { label: t("admin.tiles.fees"), value: money(o.fees) },
        ]}
      />
      {o.stuck.length > 0 && (
        <section className="space-y-2 rounded-xl border border-destructive/40 p-4" data-testid="money-out-stuck">
          <h2 className="font-semibold">{ta("stuckTitle")}</h2>
          <p className="text-xs text-muted-foreground">{ta("stuckBody")}</p>
          <ul className="divide-y text-sm">
            {o.stuck.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
                <span dir="ltr" className="text-xs text-muted-foreground">{r.number}</span>
                <span>{ta(`stuckType.${r.type === "release" ? "payout" : "refund"}`)}</span>
                <span className="tabular-nums">{money(r.amountFils, r.currency)}</span>
                <span className="rounded bg-destructive/10 px-1.5 text-[11px] text-destructive">{ta(`stuckStatus.${r.status === "failed" ? "failed" : "pending"}`)}</span>
                {r.note && <span className="w-full text-xs text-muted-foreground" dir="auto">{r.note}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="space-y-3">
        <h2 className="font-semibold">{t("admin.disputes")}</h2>
        {!o.disputes.length && <p className="text-sm text-muted-foreground">{t("admin.noDisputes")}</p>}
        {o.disputes.map((v) => {
          const cur = v.contract.currency;
          const disputedIds = new Set(v.disputes.filter((d) => ["open", "decided", "appealed"].includes(d.status)).map((d) => d.milestoneId));
          return (
            <article key={v.contract.id} className="space-y-4 rounded-2xl border border-destructive/40 p-4 text-sm" data-testid="dispute">
              <div className="flex flex-wrap items-center gap-2">
                <b dir="auto">{v.contract.title}</b>
                <span className="text-xs text-muted-foreground" dir="ltr">{v.contract.number}</span>
                {!v.contract.paymentsLive && (
                  <span className="flex items-center gap-1 rounded bg-amber-500/15 px-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                    <FlaskConical className="size-3" /> {t("receipts.test")}
                  </span>
                )}
                <span className="ms-auto text-xs">
                  {v.agency.name} ↔ <span dir="auto">{v.clientAgency?.name ?? v.contract.clientName}</span>
                </span>
              </div>

              {v.disputes
                .filter((d) => d.status !== "closed")
                .map((d) => {
                  const m = v.milestones.find((x) => x.id === d.milestoneId);
                  const held = v.heldBy[d.milestoneId] ?? 0;
                  return (
                    <div key={d.id} className="space-y-2 rounded-xl border p-3" data-testid="admin-dispute" data-status={d.status}>
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        <span dir="auto">{t("dispute.on", { milestone: m?.title ?? "" })}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{t(`dispute.state.${d.status}`)}</span>
                        <span className="ms-auto text-xs tabular-nums">{t("admin.held", { amount: money(held, cur) })}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{t("dispute.openedBy", { side: t(`dispute.sides.${d.openedBy as "agency"}`), date: formatDate(d.createdAt, locale) })}</p>
                      <p className="whitespace-pre-line rounded-lg bg-muted/60 p-2" dir="auto">{t("admin.statement", { text: d.statement })}</p>
                      {m && (
                        <div>
                          <p className="text-xs font-semibold">{t("admin.checklist")}</p>
                          <ul className="space-y-0.5 text-xs">
                            {m.checks.map((c) => (
                              <li key={c.id} className="flex items-start gap-1.5">
                                {c.confirmedByClient ? <CheckCircle2 className="mt-0.5 size-3.5 text-brand" /> : c.doneByAgency ? <CircleDashed className="mt-0.5 size-3.5 text-amber-600" /> : <Circle className="mt-0.5 size-3.5 text-muted-foreground" />}
                                <span dir="auto">{c.text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold">{t("dispute.evidence")}</p>
                        {!d.evidence.length && <p className="text-xs text-muted-foreground">{t("dispute.noEvidence")}</p>}
                        <ul className="space-y-1" data-testid="admin-evidence">
                          {d.evidence.map((e) => (
                            <li key={e.id} className="rounded-lg border p-2 text-xs">
                              <b>{t(`dispute.sides.${e.side as "agency"}`)}</b> · {formatDate(e.createdAt, locale)}
                              <p className="whitespace-pre-line" dir="auto">{e.body}</p>
                              {e.links.map((l) => (
                                <a key={l} href={l} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 truncate text-brand" dir="ltr">
                                  <Link2 className="size-3" /> {l}
                                </a>
                              ))}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {d.decision && (
                        <p className="rounded-lg bg-brand/5 p-2 text-xs" dir="auto">
                          <b>{d.status === "final" ? t("dispute.finalDecision") : t("dispute.decision")}:</b>{" "}
                          {d.decision === "release"
                            ? t("dispute.release", { amount: money(d.releaseFils ?? 0, cur) })
                            : d.decision === "refund"
                              ? t("dispute.refund", { amount: money(d.refundFils ?? 0, cur) })
                              : t("dispute.split", { release: money(d.releaseFils ?? 0, cur), refund: money(d.refundFils ?? 0, cur) })}{" "}
                          — {d.reason}
                          {d.status === "decided" && d.appealDeadline && <span className="block">{t("admin.appealWindow", { date: formatDate(d.appealDeadline, locale) })}</span>}
                        </p>
                      )}
                      {d.appealNote && <p className="rounded-lg bg-amber-500/10 p-2 text-xs" dir="auto">{t("dispute.appealed", { side: t(`dispute.sides.${d.appealedBy as "agency"}`), note: d.appealNote })}</p>}
                      {(d.status === "open" || d.status === "appealed") && held > 0 && <DisputeDecisionForm disputeId={d.id} heldFils={held} heldLabel={money(held, cur)} currency={cur} final={d.status === "appealed"} />}
                    </div>
                  );
                })}

              {/* Held milestones without a dispute of their own (older contract-level disputes): immediate final decision. */}
              {v.milestones
                .filter((m) => isHeld(m.status) && !disputedIds.has(m.id) && (v.heldBy[m.id] ?? 0) > 0 && v.contract.status === "disputed")
                .map((m) => (
                  <form key={m.id} action={resolveMilestoneAction} className="space-y-2 rounded-xl bg-muted/50 p-3">
                    <input type="hidden" name="contractId" value={v.contract.id} />
                    <input type="hidden" name="milestoneId" value={m.id} />
                    <p className="flex justify-between gap-2">
                      <span dir="auto">
                        {m.title} · {t(`ms.status.${m.status}`)} · {m.checks.filter((c) => c.doneByAgency).length}/{m.checks.length} {t("ms.agencyTick")}
                      </span>
                      <b className="tabular-nums">{money(m.amountFils, cur)}</b>
                    </p>
                    <input name="note" required minLength={3} placeholder={t("admin.decisionNote")} className="h-9 w-full rounded-md border bg-background px-2 text-xs" dir="auto" />
                    <div className="flex gap-2">
                      <button name="decision" value="release" className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted">{t("admin.release")}</button>
                      <button name="decision" value="refund" className="rounded-md border border-destructive/40 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10">{t("admin.refund")}</button>
                    </div>
                  </form>
                ))}

              <details className="rounded-xl border p-3">
                <summary className="cursor-pointer text-xs font-semibold">{t("admin.history")}</summary>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {v.events.slice(0, 40).map((e) => (
                    <li key={e.id} dir="auto">
                      {formatDate(e.createdAt, locale)} · {t(`actors.${e.actor}` as "actors.agency")} · {e.type}
                      {e.note ? `: ${e.note}` : ""}
                    </li>
                  ))}
                </ul>
              </details>

              {v.contract.status === "disputed" && !v.disputes.some((d) => d.status === "decided" || d.status === "appealed") && (
                <form action={closeDisputeAction} className="flex gap-2">
                  <input type="hidden" name="contractId" value={v.contract.id} />
                  <input name="note" required minLength={3} placeholder={t("admin.decisionNote")} className="h-9 flex-1 rounded-md border bg-background px-2 text-xs" dir="auto" />
                  <button className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted">{t("admin.closeDispute")}</button>
                </form>
              )}
            </article>
          );
        })}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{t("admin.counts")}</h2>
        <ul className="flex flex-wrap gap-2 text-xs">
          {o.counts.map((c) => (
            <li key={`${c.mode}-${c.status}`} className="rounded-full border px-2.5 py-1">
              {t(`mode.${c.mode}`)} · {t(`status.${c.status}`)}: <b className="tabular-nums">{c.n}</b>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
