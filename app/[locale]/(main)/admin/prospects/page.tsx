import { ExternalLink } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AddProspectForm, ImportResearchedButton, InvitationControls, ProspectControls } from "@/components/admin/prospect-forms";
import { listInvitations } from "@/lib/data/pioneers";
import { PIONEER, localizeDigits, sealNumber } from "@/lib/pioneers";
import { SITE_URL } from "@/lib/site";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { listProspects, researchedProspects } from "@/lib/data/prospects";
import { CITIES } from "@/lib/labels";
import { PROSPECT_STATUSES } from "@/lib/prospects";

/** Admin → Prospects (docs/55): the agencies to invite at launch and where each contact stands. */
export default async function AdminProspects({ params }: PageProps<"/[locale]/admin/prospects">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff("prospects.manage");
  const t = await getTranslations("AdminProspects");
  const tCity = await getTranslations("Cities");
  const [rows, research, invitations] = await Promise.all([listProspects(), researchedProspects(), listInvitations()]);
  const byProspect = new Map(invitations.filter((i) => i.prospectId).map((i) => [i.prospectId!, i]));
  const tl = await getTranslations("AdminProspects.letter");
  const counts = Object.fromEntries(PROSPECT_STATUSES.map((s) => [s, rows.filter((r) => r.status === s).length]));
  const cityLabel = (key: string) => (tCity.has(key) ? tCity(key) : key);
  return (
    <div className="space-y-6" data-testid="admin-prospects">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
      </header>
      <p className="text-sm" data-testid="prospects-counts">
        {PROSPECT_STATUSES.map((s) => `${t(`status.${s}`)} ${counts[s]}`).join(" · ")}
      </p>
      <ImportResearchedButton count={research.prospects.length} researchedOn={research.researchedOn} />
      <section className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-line bg-brand-soft p-3 text-sm" data-testid="pioneer-summary">
        <p>{tl("summary", { issued: localizeDigits(invitations.length, locale), cap: localizeDigits(PIONEER.cap, locale), claimed: localizeDigits(invitations.filter((i) => i.state === "claimed").length, locale), scans: localizeDigits(invitations.reduce((n, i) => n + i.scans, 0), locale) })}</p>
        {invitations.length > 0 && <a href="/pioneer-letters" target="_blank" rel="noopener" className="rounded-md border bg-background px-3 py-1.5 font-medium" data-testid="print-all-letters">{tl("printAll")}</a>}
      </section>
      <AddProspectForm cities={CITIES.map((key) => ({ key, label: cityLabel(key) }))} />
      {!rows.length ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y rounded-xl border" data-testid="prospect-list">
          {rows.map((p) => (
            <li key={p.id} className="space-y-2 p-3 text-sm" data-testid="prospect-row" data-status={p.status}>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-semibold">{p.name}</span>
                <span className="text-xs text-muted-foreground">{cityLabel(p.city)}</span>
                {p.website && (
                  <a href={p.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-brand" dir="ltr">
                    {p.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")} <ExternalLink className="size-3" aria-hidden />
                  </a>
                )}
                {p.instagram && (
                  <a href={`https://www.instagram.com/${p.instagram}/`} target="_blank" rel="noopener noreferrer nofollow" className="text-brand" dir="ltr">@{p.instagram}</a>
                )}
                {p.agencyHandle && (
                  <Link href={`/a/${p.agencyHandle}`} className="text-brand" data-testid="prospect-page">{t("joinedPage", { handle: p.agencyHandle })}</Link>
                )}
              </div>
              {p.services.length > 0 && (
                <p className="flex flex-wrap gap-1">
                  {p.services.map((s) => <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-xs">{s}</span>)}
                </p>
              )}
              {p.note && <p className="text-sm" data-testid="prospect-note">{p.note}</p>}
              <p className="text-xs text-muted-foreground">{t("source")}: {p.source}{p.contactedAt ? ` · ${t("contactedOn", { date: p.contactedAt.toISOString().slice(0, 10) })}` : ""}</p>
              <ProspectControls id={p.id} status={p.status} priority={p.priority} note={p.note ?? ""} website={p.website ?? ""} instagram={p.instagram ?? ""} />
              <InvitationControls
                prospectId={p.id}
                name={p.name}
                siteUrl={SITE_URL}
                invitation={(() => { const i = byProspect.get(p.id); return i ? { id: i.id, code: i.code, number: sealNumber(i.number, locale), scans: i.scans, watched: Boolean(i.watchedAt), state: i.state, expiresOn: i.expiresAt.toISOString().slice(0, 10), claimedHandle: i.claimedHandle } : null; })()}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
