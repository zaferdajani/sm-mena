import { Search } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/features/coming-soon";
import { CollabHeader, CollabTabs, EmptyState } from "@/components/collab/collab-tabs";
import { collabOptions } from "@/components/collab/options";
import { ProviderCard } from "@/components/collab/provider-card";
import { NeedReply, SaveToRoster } from "@/components/collab/widgets";
import { PartnerRequestButton } from "@/components/studio/partner-widgets";
import { AgencyAvatar } from "@/components/agency-avatar";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { discoverCollaborators } from "@/lib/data/collab-discovery";
import { workBadgeCount } from "@/lib/data/work-orders";
import { listOpenNeedsFor } from "@/lib/data/collab-needs";
import { isDateString } from "@/lib/collab/time";
import { WORK_MODES, type WorkMode } from "@/lib/collab/types";
import { formatFils, timeAgo } from "@/lib/format";
import { roleLabel } from "@/lib/services/catalog";
import { NextActionsPanel } from "@/components/collab/next-actions";
import { nextActions } from "@/lib/data/collab-next";
import { canUse } from "@/lib/feature-gate";
import { collabPage } from "./gate";

/** Studio → Collaborate → Discover (docs/48): agencies find providers; everyone sees published needs for their roles. */
export default async function CollabDiscoverPage({ params, searchParams }: PageProps<"/[locale]/studio/collab">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency, soon } = await collabPage();
  if (soon) return <ComingSoon feature="collaboration" />;
  const sp = await searchParams;
  const t = await getTranslations("Collab");
  const tCity = await getTranslations("Cities");
  const opts = await collabOptions(locale, agency.country);
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const roles = [str("role")].filter((r) => opts.roles.some((o) => o.key === r));
  const kind = str("kind") === "agency" || str("kind") === "freelancer" ? (str("kind") as "agency" | "freelancer") : null;
  const workMode = (WORK_MODES as readonly string[]).includes(str("workMode")) ? (str("workMode") as WorkMode) : null;
  const from = isDateString(str("from")) ? str("from") : null;
  const to = isDateString(str("to")) ? str("to") : null;
  const confirmedOnly = str("confirmed") === "1";
  const cursor = Math.max(0, Number(str("cursor")) || 0);
  const searched = Object.keys(sp).some((k) => ["role", "kind", "workMode", "from", "to", "confirmed", "q"].includes(k));
  const intel = await canUse("collaboration_intelligence");
  const [results, needs, badge, actions] = await Promise.all([
    agency.kind === "agency" || searched ? discoverCollaborators(agency, { roles: roles.length ? roles : agency.seeksRoles, kind, workMode, from: from && to ? from : null, to: from && to ? to : null, confirmedOnly, cursor }, { includeDemo: agency.isDemo }) : null,
    listOpenNeedsFor(agency),
    workBadgeCount(agency.id),
    intel ? nextActions(agency) : null,
  ]);
  const field = "h-11 w-full rounded-lg border bg-background px-2 text-sm";

  return (
    <div className="mx-auto grid max-w-3xl gap-5" data-testid="collab-discover">
      <CollabTabs active="discover" badges={{ work: badge }} />
      <CollabHeader title={t("discover.title")} intro={agency.kind === "freelancer" ? t("discover.introFreelancer") : t("discover.intro")} />
      {actions && <NextActionsPanel actions={actions} locale={locale} />}

      {agency.kind === "freelancer" && (
        <section className="grid gap-3" data-testid="open-needs">
          <h2 className="font-semibold">{t("needs.openTitle")}</h2>
          {needs.length === 0 ? (
            <EmptyState title={t("needs.noneTitle")} body={t("needs.noneBody")} action={<Link href="/studio/collab/availability" className={buttonVariants({ variant: "outline", className: "h-11" })}>{t("needs.noneAction")}</Link>} />
          ) : (
            needs.map((n) => <NeedRow key={n.id} n={n} locale={locale} />)
          )}
        </section>
      )}

      <section className="grid gap-3" data-testid="discover-providers">
        <h2 className="font-semibold">{t("discover.findTitle")}</h2>
        <form method="get" className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="discover-form">
          <label className="grid gap-1 text-sm"><span className="font-medium">{t("discover.role")}</span>
            <select name="role" defaultValue={roles[0] ?? ""} className={field} data-testid="discover-role">
              <option value="">{t("discover.roleAny")}</option>
              {opts.roles.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm"><span className="font-medium">{t("discover.kind")}</span>
            <select name="kind" defaultValue={kind ?? ""} className={field}>
              <option value="">{t("discover.kindAny")}</option>
              <option value="freelancer">{t("kinds.freelancer")}</option>
              <option value="agency">{t("kinds.agency")}</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2 lg:col-span-1"><span className="font-medium">{t("workMode.label")}</span>
            <select name="workMode" defaultValue={workMode ?? ""} className={field}>
              <option value="">{t("discover.modeAny")}</option>
              {WORK_MODES.map((m) => <option key={m} value={m}>{t(`workMode.${m}`)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm"><span className="font-medium">{t("discover.from")}</span><input name="from" type="date" defaultValue={from ?? ""} className={field} dir="ltr" /></label>
          <label className="grid gap-1 text-sm"><span className="font-medium">{t("discover.to")}</span><input name="to" type="date" defaultValue={to ?? ""} className={field} dir="ltr" /></label>
          <label className="flex min-h-11 items-center gap-2 self-end text-sm"><input type="checkbox" name="confirmed" value="1" defaultChecked={confirmedOnly} className="size-4 accent-[var(--primary)]" data-testid="discover-confirmed" /> {t("discover.confirmedOnly")}</label>
          <input type="hidden" name="q" value="1" />
          <button type="submit" className={buttonVariants({ className: "h-11 gap-1.5 sm:col-span-2 lg:col-span-3 lg:justify-self-start lg:px-6" })}><Search className="size-4" /> {t("discover.search")}</button>
        </form>
        {results === null ? (
          <p className="text-sm text-muted-foreground">{t("discover.pickRole")}</p>
        ) : results.items.length === 0 ? (
          <EmptyState title={t("discover.emptyTitle")} body={t("discover.emptyBody")} action={<Link href="/studio/collab/needs" className={buttonVariants({ className: "h-11" })}>{t("discover.emptyAction")}</Link>} />
        ) : (
          <>
            <p className="text-xs text-muted-foreground" data-testid="discover-count">{t("discover.count", { count: results.total })}{results.truncated ? ` · ${t("discover.truncated")}` : ""}</p>
            {["ready", "needs_confirmation"].map((group) => {
              const rows = results.items.filter((r) => r.group === group);
              if (!rows.length) return null;
              return (
                <div key={group} className="grid gap-2" data-testid={`group-${group}`}>
                  <h3 className="text-sm font-semibold text-muted-foreground">{t(`discover.group.${group}`)}</h3>
                  {rows.map((r) => (
                    <ProviderCard key={r.candidate.id} card={r.card} locale={locale} roles={r.matchedRoles} reasons={r.reasons} availability={r.candidate.availability}>
                      <Link href={{ pathname: "/studio/collab/work/new", query: { to: r.card.id } }} className={buttonVariants({ size: "lg", className: "h-11 w-full" })} data-testid="inquire-link">{t("inquiry.start")}</Link>
                      <SaveToRoster providerAgencyId={r.card.id} saved={r.candidate.saved} />
                      {!r.candidate.partner && <PartnerRequestButton toAgencyId={r.card.id} name={r.card.name} roles={opts.roles} matched={r.matchedRoles.length ? r.matchedRoles : roles} large />}
                    </ProviderCard>
                  ))}
                </div>
              );
            })}
            {results.next !== null && (
              <Link href={{ pathname: "/studio/collab", query: { ...Object.fromEntries(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]), cursor: String(results.next) } }} className={buttonVariants({ variant: "outline", className: "h-11 justify-self-center" })} data-testid="discover-more">
                {t("discover.more")}
              </Link>
            )}
          </>
        )}
      </section>

      {agency.kind === "agency" && (
        <section className="grid gap-3" data-testid="open-needs">
          <h2 className="font-semibold">{t("needs.openTitleAgency")}</h2>
          {needs.length === 0 ? <EmptyState title={t("needs.noneAgency")} body={t("needs.noneAgencyBody")} action={<Link href="/studio/collab/needs" className={buttonVariants({ variant: "outline", className: "h-11" })}>{t("needs.publish")}</Link>} /> : needs.map((n) => <NeedRow key={n.id} n={n} locale={locale} />)}
        </section>
      )}
      <p className="text-xs text-muted-foreground">{t("discover.cityNote", { city: tCity(agency.city) })}</p>
    </div>
  );
}

async function NeedRow({ n, locale }: { n: Awaited<ReturnType<typeof listOpenNeedsFor>>[number]; locale: string }) {
  const t = await getTranslations("Collab");
  const tCity = await getTranslations("Cities");
  return (
    <article className="grid gap-2 rounded-2xl border p-3" data-testid="open-need">
      <div className="flex items-center gap-3">
        <AgencyAvatar name={n.agency.name} src={n.agency.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold break-words" dir="auto">{n.title}</p>
          <p className="text-xs text-muted-foreground">
            <Link href={`/a/${n.agency.handle}`} className="hover:underline">{n.agency.name}</Link> · {n.city ? tCity(n.city) : t("needs.anyCity")} · {t(`workMode.${n.workMode}`)} · {timeAgo(n.publishedAt!.toISOString(), locale)}
          </p>
        </div>
      </div>
      <p className="flex flex-wrap gap-1">{n.matchedRoles.map((r) => <span key={r} className="rounded-full border border-brand-line bg-brand-soft px-2 py-0.5 text-xs">{roleLabel(r, locale)}</span>)}</p>
      {n.scope && <p className="text-sm whitespace-pre-line" dir="auto">{n.scope}</p>}
      <p className="text-xs text-muted-foreground">
        {n.startsOn || n.endsOn ? <><bdi dir="ltr">{n.startsOn ?? "…"} → {n.endsOn ?? "…"}</bdi> · </> : ""}
        {n.budgetMaxFils ? t("needs.budgetUpTo", { amount: formatFils(n.budgetMaxFils, locale, n.currency) }) : t("needs.budgetOpen")} · {n.modes.map((m) => t(`modes.${m}`)).join(locale === "ar" ? "، " : ", ")}
      </p>
      <NeedReply needId={n.id} replied={n.myReply === "interested"} />
    </article>
  );
}
