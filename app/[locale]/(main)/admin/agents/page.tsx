import { Download } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CreateAgentForm, TiersForm } from "@/components/admin/agent-forms";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { phoneCountry } from "@/lib/country-choice";
import { getTiers, listAgentsWithStats } from "@/lib/data/referrals";
import { formatFils } from "@/lib/format";

/** Admin → Agents (docs/42): who brings providers, how many became active, and what each is owed. */
export default async function AdminAgents({ params }: PageProps<"/[locale]/admin/agents">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff("agents.manage");
  const t = await getTranslations("AdminAgents");
  const [rows, tiers, country] = await Promise.all([listAgentsWithStats(), getTiers(), phoneCountry()]);
  const totals = rows.reduce((s, r) => ({ signedUp: s.signedUp + r.stats.signedUp, active: s.active + r.stats.active, owed: s.owed + r.stats.owed }), { signedUp: 0, active: 0, owed: 0 });
  return (
    <div className="space-y-6" data-testid="admin-agents">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("intro")}</p>
        </div>
        <a href={`/${locale}/admin/agents/export`} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm" data-testid="agents-export">
          <Download className="size-4" aria-hidden /> {t("export")}
        </a>
      </header>
      <p className="text-sm">{t("totals", { agents: rows.length, signedUp: totals.signedUp, active: totals.active, owed: formatFils(totals.owed, locale, "JOD") })}</p>

      {rows.length ? (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                {["agent", "code", "signedUp", "active", "earned", "paid", "owed"].map((h) => (
                  <th key={h} className="p-2 text-start font-medium">{t(`cols.${h}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(({ agent, stats }) => (
                <tr key={agent.id} data-testid="agent-row">
                  <td className="p-2">
                    <Link href={`/admin/agents/${agent.id}`} className="font-medium text-brand">{agent.name}</Link>
                    {!agent.active && <span className="ms-1 text-xs text-destructive">({t("paused")})</span>}
                  </td>
                  <td className="p-2 font-mono" dir="ltr">{agent.code}</td>
                  <td className="p-2 tabular-nums">{stats.signedUp}</td>
                  <td className="p-2 tabular-nums">{stats.active}</td>
                  <td className="p-2 tabular-nums">{formatFils(stats.money.total, locale, agent.currency)}</td>
                  <td className="p-2 tabular-nums">{formatFils(stats.paid, locale, agent.currency)}</td>
                  <td className="p-2 font-semibold tabular-nums">{formatFils(stats.owed, locale, agent.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{t("empty")}</p>
      )}

      <CreateAgentForm phoneCountry={country} />
      <TiersForm value={tiers.map((x) => `${x.at}: ${x.bonusFils / 1000}`).join("\n")} />
    </div>
  );
}
