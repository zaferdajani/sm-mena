import { RegistrationStudioShell } from "@/components/registration/studio-shell";
import { SwissWorkspace } from "@/components/layout/swiss-workspace";
import { MedalPanel } from "@/components/pioneer/medal-panel";
import { isRegistrationPhase, isLaunchPilot } from "@/lib/launch-phase";
import { ExternalLink, LogOut, Plus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { logout } from "@/app/[locale]/(auth)/actions";
import { AgencyAvatar } from "@/components/agency-avatar";
import { StudioNav } from "@/components/studio/studio-nav";
import { CreatorSetupNudge } from "@/components/studio/creator-guide";
import { SuspendedNotice } from "@/components/studio/suspended-notice";
import { Link } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { unreadForAgency } from "@/lib/data/conversations";
import { unreadCount } from "@/lib/data/inbox";
import { unreadNotificationCount } from "@/lib/data/notifications";
import { newOpportunityCount } from "@/lib/data/requests";
import { pendingPartnerCount } from "@/lib/data/partners";
import { openInquiryCount } from "@/lib/data/collab-inquiries";
import { pendingOrderCount } from "@/lib/data/work-orders";
import { mediaUrl } from "@/lib/storage";
import { featureGate } from "@/lib/feature-gate";
import { ADAPTERS, readiness, type SocialProviderId } from "@/lib/social/providers";

export const metadata: Metadata = { robots: { index: false } };

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const { agency } = await requireAgency();
  if (isRegistrationPhase() && !isLaunchPilot(agency.handle)) return <RegistrationStudioShell agency={agency}><SuspendedNotice status={agency.status} /><MedalPanel agencyId={agency.id} />{children}</RegistrationStudioShell>;
  const t = await getTranslations("Studio");
  const ta = await getTranslations("Auth");
  const tr = await getTranslations("Reviews");
  const tp = await getTranslations("Packages");
  const to = await getTranslations("Opportunities");
  const tl = await getTranslations("Agreements");
  const tchat = await getTranslations("Chat");
  const tn = await getTranslations("Notifications");
  const tpart = await getTranslations("Partners");
  const tcol = await getTranslations("Collab");
  const tg = await getTranslations("CreatorSetup");
  const [partnersGate, collabGate, openInquiries, pendingOrders, unread, unreadChats, newOpportunities, unreadNotes, partnerRequests] = await Promise.all([
    featureGate("partners"),
    featureGate("collaboration"),
    openInquiryCount(agency.id),
    pendingOrderCount(agency.id),
    unreadCount(agency.id),
    unreadForAgency(agency.id),
    newOpportunityCount(agency),
    unreadNotificationCount({ agencyId: agency.id }),
    pendingPartnerCount(agency.id),
  ]);
  const connectionsReady = (Object.keys(ADAPTERS) as SocialProviderId[]).some((p) => readiness(p).state === "ready");
  return (
    <SwissWorkspace>
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <AgencyAvatar name={agency.name} src={mediaUrl(agency.avatarKey)} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold" dir="auto">{agency.name}</p>
          <Link href={`/a/${agency.handle}`} className="flex items-center gap-1 text-xs text-brand">
            {t("viewPage")} <ExternalLink className="size-3" />
          </Link>
        </div>
        <Link href={agency.postCount ? "/studio/new" : "/portfolio-setup"} className="sw-invitation-cta inline-flex items-center gap-1.5" data-testid="studio-add-work"><Plus className="size-4" aria-hidden />{t("nav.addWork")}</Link>
        <form action={logout}>
          <button type="submit" className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
            <LogOut className="size-4 rtl:-scale-x-100" />
            {ta("logout")}
          </button>
        </form>
      </div>
      <div className="mt-3">
        <StudioNav
          items={[
            { href: "/studio", label: t("nav.home") },
            { href: "/studio/posts", label: t("nav.work") },
            { href: "/studio/profile", label: t("nav.page") },
            { href: "/studio/security", label: t("nav.account") },
            // Sections with news earn a tab of their own for as long as the news lasts (docs/65).
            ...(newOpportunities ? [{ href: "/studio/opportunities", label: to("tab"), badge: newOpportunities }] : []),
            ...(unreadChats ? [{ href: "/studio/messages", label: tchat("tab"), badge: unreadChats }] : []),
            ...(unread ? [{ href: "/studio/inbox", label: t("inbox"), badge: unread }] : []),
          ]}
          more={[
            { href: "/studio/packages", label: tp("studio.tab") },
            { href: "/studio/publication", label: t("nav.visibility") },
            { href: "/studio/clients", label: t("clients") },
            { href: "/studio/import", label: t("nav.import") },
            { href: "/studio/followers", label: t("followers") },
            ...(newOpportunities ? [] : [{ href: "/studio/opportunities", label: to("tab") }]),
            ...(unreadChats ? [] : [{ href: "/studio/messages", label: tchat("tab") }]),
            ...(unread ? [] : [{ href: "/studio/inbox", label: t("inbox") }]),
            { href: "/studio/notifications", label: tn("tab"), badge: unreadNotes },
            ...(collabGate !== "off" ? [{ href: "/studio/collab", label: tcol("tab"), badge: openInquiries + pendingOrders }] : []),
            ...(partnersGate !== "off" ? [{ href: "/studio/partners", label: tpart("tab"), badge: partnerRequests }] : []),
            { href: "/studio/reviews", label: tr("studio.tab") },
            { href: "/studio/contracts", label: t("contracts") },
            { href: "/studio/ndas", label: tl("ndaStudio.tab") },
            // Hidden while no platform can be connected: a page of "not available yet" cards is a dead end.
            ...(connectionsReady ? [{ href: "/studio/connections", label: tg("connectionsNav") }] : []),
            { href: "/studio/setup", label: tg("nav") },
            { href: "/studio/billing", label: t("billing") },
          ]}
          moreLabel={t("nav.more")}
        />
      </div>
      <div className="sw-workspace-body py-6">
        <SuspendedNotice status={agency.status} />
        <CreatorSetupNudge hasWork={agency.postCount > 0} />
        <MedalPanel agencyId={agency.id} />
        {children}
      </div>
    </SwissWorkspace>
  );
}
