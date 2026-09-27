import { CheckCircle2, Circle, Trophy } from "lucide-react";
import type { Metadata } from "next";
import QRCode from "qrcode";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AgentLink } from "@/components/referrals/agent-link";
import { SignInPanel } from "@/components/security/sign-in-panel";
import { requireAgent } from "@/lib/auth/guards";
import { agentStats, getTiers, listAgentsWithStats } from "@/lib/data/referrals";
import { formatDate, formatFils } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/agent">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Agent" });
  return { title: t("title"), robots: { index: false } };
}

/**
 * A referral agent's page (docs/42): their link and QR code for meeting
 * agencies and freelancers, who they brought and what each still needs to
 * count, what they've earned and been paid, and the agents' leaderboard.
 */
export default async function AgentPage({ params }: PageProps<"/[locale]/agent">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user, agent } = await requireAgent();
  const t = await getTranslations("Agent");
  const tiers = await getTiers();
  const [stats, board] = await Promise.all([agentStats(agent, tiers), listAgentsWithStats()]);
  const url = `${SITE_URL}/${locale}/j/${agent.code}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  const money = (f: number) => formatFils(f, locale, agent.currency);
  const rank = board.findIndex((b) => b.agent.id === agent.id) + 1;
  const firstName = (n: string) => n.trim().split(/\s+/)[0];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6" data-testid="agent-page">
      <header>
        <h1 className="text-xl font-bold">{t("hello", { name: firstName(agent.name) })}</h1>
        <p className="text-sm text-muted-foreground">{t("intro", { rate: money(agent.rateFils) })}</p>
        {!agent.active && <p className="mt-2 rounded-lg bg-destructive/10 p-2 text-sm">{t("paused")}</p>}
      </header>

      <section className="grid gap-4 rounded-2xl border p-4 sm:grid-cols-[1fr_10rem]">
        <div>
          <h2 className="mb-2 font-semibold">{t("yourLink")}</h2>
          <AgentLink url={url} code={agent.code} />
        </div>
        <div className="mx-auto w-40 rounded-xl bg-white p-2" aria-label={t("qr")} role="img" dangerouslySetInnerHTML={{ __html: qr }} data-testid="agent-qr" />
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="agent-stats">
        {[
          [t("stats.signedUp"), String(stats.signedUp)],
          [t("stats.active"), String(stats.active)],
          [t("stats.earned"), money(stats.money.total)],
          [t("stats.owed"), money(stats.owed)],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col-reverse rounded-xl border p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-xl font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="-mt-5 text-xs text-muted-foreground">
        {t("paidSoFar", { amount: money(stats.paid) })} · {t("payNote")}
      </p>

      <section className="rounded-2xl border p-4">
        <h2 className="font-semibold">{t("bonusTitle")}</h2>
        <ol className="mt-3 flex flex-wrap gap-2 text-sm">
          {tiers.map((tier) => (
            <li key={tier.at} className={cn("rounded-full border px-3 py-1", stats.active >= tier.at ? "border-brand bg-brand/10 text-brand" : "text-muted-foreground")}>
              {t("tier", { at: tier.at, bonus: money(tier.bonusFils) })}
            </li>
          ))}
        </ol>
        {stats.money.next && <p className="mt-3 text-sm font-medium" data-testid="agent-next-tier">{t("toNext", { count: stats.money.toNext, bonus: money(stats.money.next.bonusFils) })}</p>}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">{t("referredTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("activeRule")}</p>
        {stats.referred.length ? (
          <ul className="divide-y rounded-2xl border" data-testid="agent-referred">
            {stats.referred.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm">
                {r.active ? <CheckCircle2 className="size-5 text-brand" aria-hidden /> : <Circle className="size-5 text-muted-foreground" aria-hidden />}
                <span className="min-w-0 flex-1">
                  <bdi className="font-medium">{r.name}</bdi> <span className="text-xs text-muted-foreground" dir="ltr">@{r.handle}</span>
                  <span className="block text-xs text-muted-foreground">{formatDate(r.createdAt, locale)}</span>
                </span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px]", r.active ? "bg-brand/10 text-brand" : r.referralVoidReason ? "bg-destructive/10 text-destructive" : "bg-muted")} data-testid="referral-status">
                  {r.referralVoidReason ? t("status.void") : r.active ? t("status.active") : t("status.pending")}
                </span>
                {!r.active && !r.referralVoidReason && r.missing.length > 0 && (
                  <span className="w-full ps-8 text-xs text-muted-foreground">{t("needs", { items: r.missing.map((m) => t(`missing.${m}`)).join(" · ") })}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{t("empty")}</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Trophy className="size-4 text-brand" aria-hidden /> {t("boardTitle")}
        </h2>
        {rank > 0 && <p className="text-sm">{t("yourRank", { rank, count: board.length })}</p>}
        <ol className="divide-y rounded-2xl border text-sm" data-testid="agent-board">
          {board.slice(0, 10).map((b, i) => (
            <li key={b.agent.id} className={cn("flex items-center gap-3 p-3", b.agent.id === agent.id && "bg-brand/5 font-semibold")}>
              <span className="w-6 text-muted-foreground tabular-nums">{i + 1}</span>
              <span className="flex-1">{firstName(b.agent.name)}</span>
              <span className="tabular-nums">{t("boardActive", { count: b.stats.active })}</span>
            </li>
          ))}
        </ol>
      </section>

      <SignInPanel email={user.email} mfaEnabled={user.mfaEnabled} />
    </div>
  );
}
