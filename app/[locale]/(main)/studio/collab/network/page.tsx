import { Ban, Handshake } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/features/coming-soon";
import { CollabHeader, CollabTabs, EmptyState } from "@/components/collab/collab-tabs";
import { collabOptions } from "@/components/collab/options";
import { ProviderCard } from "@/components/collab/provider-card";
import { CollabProfileForm, InvitePanel, RosterEditor } from "@/components/collab/widgets";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { currencyOf } from "@/lib/countries";
import { availabilityStates } from "@/lib/data/collab-availability";
import { myBlocks } from "@/lib/data/collab-blocks";
import { partnerIdsOf } from "@/lib/data/collab-discovery";
import { workBadgeCount } from "@/lib/data/work-orders";
import { listInvites } from "@/lib/data/collab-invites";
import { getCollabProfile } from "@/lib/data/collab-profile";
import { listRoster } from "@/lib/data/collab-roster";
import { listPartnerRequests, pendingPartnerCount } from "@/lib/data/partners";
import { formatDate, formatFils } from "@/lib/format";
import { blockAction, removeRosterAction, revokeInviteAction } from "../actions";
import { collabPage } from "../gate";

/** Studio → Collaborate → My network: private roster, partners, invitation links, preference. */
export default async function CollabNetworkPage({ params, searchParams }: PageProps<"/[locale]/studio/collab/network">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency, soon } = await collabPage();
  if (soon) return <ComingSoon feature="collaboration" />;
  const invited = (await searchParams).invited === "1";
  const t = await getTranslations("Collab");
  const [roster, invites, profile, partnerIds, requests, pending, blocks, opts, badge] = await Promise.all([
    listRoster(agency.id), listInvites(agency.id), getCollabProfile(agency.id), partnerIdsOf(agency.id), listPartnerRequests(agency.id), pendingPartnerCount(agency.id), myBlocks(agency.id), collabOptions(locale, agency.country), workBadgeCount(agency.id),
  ]);
  const availability = await availabilityStates(roster.map((r) => r.providerAgencyId), null, { partnerIds });
  const groups = [...new Set(roster.map((r) => r.groupName))].sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));
  // Accepted partners who are not on the roster yet: one line each, so the roster can grow from them.
  const partnersOnly = requests.filter((r, i, all) => r.status === "accepted" && all.findIndex((x) => x.status === "accepted" && x.other.id === r.other.id) === i && !roster.some((e) => e.providerAgencyId === r.other.id));
  const currency = currencyOf(agency.country);

  return (
    <div className="mx-auto grid max-w-3xl gap-5" data-testid="collab-network">
      <CollabTabs active="network" badges={{ work: badge }} />
      <CollabHeader title={t("network.title")} intro={t("network.intro")} />
      {invited && <p role="status" className="rounded-xl border border-brand-line bg-brand-soft p-3 text-sm" data-testid="invite-accepted-note">✓ {t("invites.acceptedNote")}</p>}
      {pending > 0 && (
        <Link href="/studio/partners" className="flex items-center gap-2 rounded-xl border border-brand-line bg-brand-soft p-3 text-sm" data-testid="pending-partner-note">
          <Handshake className="size-4 text-brand" /> {t("network.pendingRequests", { count: pending })}
        </Link>
      )}

      <section className="grid gap-3" data-testid="roster">
        <h2 className="font-semibold">{t("roster.title")}</h2>
        <p className="text-xs text-muted-foreground">{t("roster.intro")}</p>
        {roster.length === 0 && partnersOnly.length === 0 ? (
          <EmptyState title={t("roster.emptyTitle")} body={t("roster.emptyBody")} action={<Link href="/studio/collab" className={buttonVariants({ className: "h-11" })}>{t("roster.emptyAction")}</Link>} />
        ) : (
          groups.map((g) => (
            <div key={g || "_"} className="grid gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">{g || t("roster.ungrouped")}</h3>
              {roster.filter((r) => r.groupName === g).map((r) => (
                <div key={r.id} className="grid gap-2" data-testid="roster-entry">
                  <ProviderCard card={{ ...r.provider, isVerified: false }} locale={locale} roles={r.tags} availability={availability.get(r.providerAgencyId)}>
                    <Link href={{ pathname: "/studio/collab/work/new", query: { to: r.providerAgencyId } }} className={buttonVariants({ className: "h-11 w-full" })} data-testid="roster-inquire">{r.lastEngagedAt ? t("roster.rehire") : t("inquiry.start")}</Link>
                    <form action={removeRosterAction}><input type="hidden" name="providerAgencyId" value={r.providerAgencyId} /><SubmitButton variant="ghost" className="h-11 w-full">{t("roster.remove")}</SubmitButton></form>
                  </ProviderCard>
                  <p className="text-xs text-muted-foreground">
                    {partnerIds.has(r.providerAgencyId) ? t("roster.partner") : t("roster.notPartner")}
                    {r.lastEngagedAt ? ` · ${t("roster.lastEngaged", { date: formatDate(r.lastEngagedAt, locale) })}` : ""}
                    {r.rateFils ? ` · ${t("roster.rateRef", { amount: formatFils(r.rateFils, locale, r.rateCurrency ?? currency), unit: t(`roster.rateUnits.${r.rateUnit ?? "day"}`) })}` : ""}
                  </p>
                  <RosterEditor providerAgencyId={r.providerAgencyId} groupName={r.groupName} tags={r.tags} notes={r.notes} rate={r.rateFils} rateUnit={r.rateUnit} currency={currency} />
                </div>
              ))}
            </div>
          ))
        )}
        {partnersOnly.length > 0 && (
          <div className="grid gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">{t("roster.partnersNotSaved")}</h3>
            {partnersOnly.map((r) => (
              <ProviderCard key={r.id} card={{ ...r.other, isVerified: false }} locale={locale} roles={r.roles}>
                <Link href={{ pathname: "/studio/collab/work/new", query: { to: r.other.id } }} className={buttonVariants({ className: "h-11 w-full" })}>{t("inquiry.start")}</Link>
              </ProviderCard>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3" data-testid="invites">
        <h2 className="font-semibold">{t("invites.sectionTitle")}</h2>
        <InvitePanel roles={opts.roles} />
        {invites.length > 0 && (
          <ul className="divide-y rounded-2xl border text-sm">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 p-3" data-testid="invite-row" data-status={i.status}>
                <span className="min-w-0 flex-1">
                  <span className="font-medium" dir="auto">{i.label || t("invites.unnamed")}</span>
                  <span className="block text-xs text-muted-foreground">{t(`invites.status.${i.status === "pending" && i.expiresAt <= new Date() ? "expired" : i.status}`)} · {formatDate(i.createdAt, locale)}</span>
                </span>
                {i.status === "pending" && i.expiresAt > new Date() && (
                  <form action={revokeInviteAction}><input type="hidden" name="id" value={i.id} /><SubmitButton variant="ghost" className="h-9">{t("invites.revoke")}</SubmitButton></form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <CollabProfileForm modes={profile?.modes ?? []} workModes={profile?.workModes ?? []} openToWork={profile?.openToWork ?? null} />

      {blocks.length > 0 && (
        <section className="grid gap-2 text-sm" data-testid="blocks">
          <h2 className="flex items-center gap-2 font-semibold"><Ban className="size-4" /> {t("blocks.title")}</h2>
          {blocks.map((b) => (
            <form key={b.blockedAgencyId} action={blockAction} className="flex items-center justify-between gap-2 rounded-xl border p-3">
              <input type="hidden" name="agencyId" value={b.blockedAgencyId} /><input type="hidden" name="undo" value="1" />
              <span className="min-w-0 truncate" dir="auto">{b.name}</span>
              <SubmitButton variant="outline" className="h-9">{t("blocks.unblock")}</SubmitButton>
            </form>
          ))}
        </section>
      )}
      <p className="text-xs text-muted-foreground">
        {t("network.legacy")} <Link href="/studio/partners" className="text-brand underline-offset-4 hover:underline">{t("network.legacyLink")}</Link>
      </p>
    </div>
  );
}
