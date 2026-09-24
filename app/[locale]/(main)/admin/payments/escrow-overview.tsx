import { getTranslations } from "next-intl/server";
import { StatTiles } from "@/components/admin/stat-tiles";
import { escrowOverview } from "@/lib/data/contracts";
import { formatDate, formatFils } from "@/lib/format";
import { closeDisputeAction, resolveMilestoneAction } from "../contract-actions";

// Protected client payments: money held for milestones, payouts, refunds, fees and disputes.
export async function EscrowOverview({ locale }: { locale: string }) {
  const t = await getTranslations("Contracts");
  const o = await escrowOverview();
  const money = (f: number) => formatFils(f, locale);
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
      <section className="space-y-3">
        <h2 className="font-semibold">{t("admin.disputes")}</h2>
        {!o.disputes.length && <p className="text-sm text-muted-foreground">{t("admin.noDisputes")}</p>}
        {o.disputes.map((v) => (
          <article key={v.contract.id} className="space-y-3 rounded-2xl border border-destructive/40 p-4 text-sm" data-testid="dispute">
            <div className="flex flex-wrap items-center gap-2">
              <b dir="auto">{v.contract.title}</b>
              <span className="text-xs text-muted-foreground" dir="ltr">{v.contract.number}</span>
              <span className="ms-auto text-xs">
                {v.agency.name} ↔ <span dir="auto">{v.contract.clientName}</span>
              </span>
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {v.events
                .filter((e) => e.type === "dispute" || e.type === "changes_requested" || e.type === "submitted")
                .slice(0, 5)
                .map((e) => (
                  <li key={e.id} dir="auto">
                    {formatDate(e.createdAt, locale)} · {t(`actors.${e.actor}` as "actors.agency")}: {e.note}
                  </li>
                ))}
            </ul>
            {v.milestones
              .filter((m) => ["funded", "submitted", "changes_requested", "approved"].includes(m.status))
              .map((m) => (
                <form key={m.id} action={resolveMilestoneAction} className="space-y-2 rounded-xl bg-muted/50 p-3">
                  <input type="hidden" name="contractId" value={v.contract.id} />
                  <input type="hidden" name="milestoneId" value={m.id} />
                  <p className="flex justify-between gap-2">
                    <span dir="auto">
                      {m.title} · {t(`ms.status.${m.status}`)} · {m.checks.filter((c) => c.doneByAgency).length}/{m.checks.length} {t("ms.agencyTick")}
                    </span>
                    <b className="tabular-nums">{money(m.amountFils)}</b>
                  </p>
                  <input name="note" required minLength={3} placeholder={t("admin.decisionNote")} className="h-9 w-full rounded-md border bg-background px-2 text-xs" dir="auto" />
                  <div className="flex gap-2">
                    <button name="decision" value="release" className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted">{t("admin.release")}</button>
                    <button name="decision" value="refund" className="rounded-md border border-destructive/40 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10">{t("admin.refund")}</button>
                  </div>
                </form>
              ))}
            <form action={closeDisputeAction} className="flex gap-2">
              <input type="hidden" name="contractId" value={v.contract.id} />
              <input name="note" required minLength={3} placeholder={t("admin.decisionNote")} className="h-9 flex-1 rounded-md border bg-background px-2 text-xs" dir="auto" />
              <button className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted">{t("admin.closeDispute")}</button>
            </form>
          </article>
        ))}
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
