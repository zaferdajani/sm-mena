import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { updateAgentAction, voidReferralAction } from "@/app/[locale]/(main)/admin/agent-actions";
import { PayoutForm } from "@/components/admin/agent-forms";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { agentStats, getAgent, listPayouts } from "@/lib/data/referrals";
import { formatDate, formatFils } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

/** Admin → Agents → one agent: referrals (void or restore), pay rate, payouts. */
export default async function AdminAgent({ params }: PageProps<"/[locale]/admin/agents/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireStaff("agents.manage");
  const agent = await getAgent(id);
  if (!agent) notFound();
  const t = await getTranslations("AdminAgents");
  const ta = await getTranslations("Agent");
  const [stats, payouts] = await Promise.all([agentStats(agent), listPayouts(agent.id)]);
  const money = (f: number) => formatFils(f, locale, agent.currency);
  return (
    <div className="space-y-6" data-testid="admin-agent">
      <Link href="/admin/agents" className="text-sm text-brand">← {t("back")}</Link>
      <header>
        <h2 className="text-lg font-semibold">{agent.name}</h2>
        <p className="text-sm text-muted-foreground" dir="ltr">{`${SITE_URL}/${locale}/j/${agent.code}`}{agent.phone ? ` · ${agent.phone}` : ""}</p>
        {agent.note && <p className="text-sm">{agent.note}</p>}
      </header>
      <p className="text-sm">
        {t("summary", { signedUp: stats.signedUp, active: stats.active, earned: money(stats.money.total), paid: money(stats.paid), owed: money(stats.owed) })}
      </p>

      <section className="flex flex-wrap items-end gap-4 rounded-2xl border p-4">
        <form action={updateAgentAction} className="flex items-end gap-2">
          <input type="hidden" name="agentId" value={agent.id} />
          <div className="grid gap-1.5">
            <label htmlFor="rate" className="text-sm font-medium">{t("rate")}</label>
            <Input id="rate" name="rate" type="number" min={0} step="0.5" defaultValue={agent.rateFils / 1000} dir="ltr" className="max-w-28" />
          </div>
          <SubmitButton variant="outline">{t("saveRate")}</SubmitButton>
        </form>
        <form action={updateAgentAction}>
          <input type="hidden" name="agentId" value={agent.id} />
          <input type="hidden" name="active" value={agent.active ? "0" : "1"} />
          <SubmitButton variant="outline">{agent.active ? t("pause") : t("resume")}</SubmitButton>
        </form>
      </section>

      <section className="space-y-2 rounded-2xl border p-4">
        <h3 className="font-semibold">{t("payoutsTitle")}</h3>
        <PayoutForm agentId={agent.id} />
        {payouts.length > 0 && (
          <ul className="divide-y text-sm">
            {payouts.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 py-2">
                <span>{formatDate(p.createdAt, locale)}{p.note ? ` · ${p.note}` : ""}</span>
                <span className="font-semibold tabular-nums">{money(p.amountFils)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">{ta("referredTitle")}</h3>
        <ul className="divide-y rounded-2xl border text-sm" data-testid="admin-agent-referred">
          {stats.referred.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 p-3">
              <span className="min-w-0 flex-1">
                <Link href={`/a/${r.handle}`} className="font-medium">{r.name}</Link> <span className="text-xs text-muted-foreground" dir="ltr">@{r.handle}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatDate(r.createdAt, locale)} · {r.referralVoidReason ? `${ta("status.void")}: ${r.referralVoidReason}` : r.active ? ta("status.active") : ta("needs", { items: r.missing.map((m) => ta(`missing.${m}`)).join(" · ") })}
                </span>
              </span>
              <form action={voidReferralAction} className="flex items-center gap-2">
                <input type="hidden" name="agencyId" value={r.id} />
                {r.referralVoidReason ? (
                  <SubmitButton variant="outline" className="h-8 text-xs">{t("restore")}</SubmitButton>
                ) : (
                  <>
                    <Input name="reason" placeholder={t("voidReason")} maxLength={200} className="h-8 w-40 text-xs" required />
                    <SubmitButton variant="outline" className="h-8 text-xs">{t("void")}</SubmitButton>
                  </>
                )}
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
