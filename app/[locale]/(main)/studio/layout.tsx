import { ExternalLink, LogOut } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { logout } from "@/app/[locale]/(auth)/actions";
import { AgencyAvatar } from "@/components/agency-avatar";
import { StudioNav } from "@/components/studio/studio-nav";
import { Link } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { unreadForAgency } from "@/lib/data/conversations";
import { unreadCount } from "@/lib/data/inbox";
import { unreadNotificationCount } from "@/lib/data/notifications";
import { newOpportunityCount } from "@/lib/data/requests";
import { pendingPartnerCount } from "@/lib/data/partners";
import { mediaUrl } from "@/lib/storage";

export const metadata: Metadata = { robots: { index: false } };

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const { agency } = await requireAgency();
  const t = await getTranslations("Studio");
  const ta = await getTranslations("Auth");
  const tr = await getTranslations("Reviews");
  const tp = await getTranslations("Packages");
  const to = await getTranslations("Opportunities");
  const tl = await getTranslations("Agreements");
  const tchat = await getTranslations("Chat");
  const tn = await getTranslations("Notifications");
  const tpart = await getTranslations("Partners");
  const [unread, unreadChats, newOpportunities, unreadNotes, partnerRequests] = await Promise.all([
    unreadCount(agency.id),
    unreadForAgency(agency.id),
    newOpportunityCount(agency),
    unreadNotificationCount({ agencyId: agency.id }),
    pendingPartnerCount(agency.id),
  ]);
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-center gap-3 px-4 pt-4 sm:pt-8">
        <AgencyAvatar name={agency.name} src={mediaUrl(agency.avatarKey)} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{agency.name}</p>
          <Link href={`/a/${agency.handle}`} className="flex items-center gap-1 text-xs text-brand">
            {t("viewPage")} <ExternalLink className="size-3" />
          </Link>
        </div>
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
            { href: "/studio", label: t("overview") },
            { href: "/studio/new", label: t("newPost") },
            { href: "/studio/posts", label: t("posts") },
            { href: "/studio/clients", label: t("clients") },
            { href: "/studio/partners", label: tpart("tab"), badge: partnerRequests },
            { href: "/studio/opportunities", label: to("tab"), badge: newOpportunities },
            { href: "/studio/messages", label: tchat("tab"), badge: unreadChats },
            { href: "/studio/notifications", label: tn("tab"), badge: unreadNotes },
            { href: "/studio/inbox", label: t("inbox"), badge: unread },
            { href: "/studio/reviews", label: tr("studio.tab") },
            { href: "/studio/packages", label: tp("studio.tab") },
            { href: "/studio/contracts", label: t("contracts") },
            { href: "/studio/ndas", label: tl("ndaStudio.tab") },
            { href: "/studio/profile", label: t("profile") },
            { href: "/studio/billing", label: t("billing") },
            { href: "/studio/security", label: t("security") },
          ]}
        />
      </div>
      <div className="px-4 py-5">{children}</div>
    </div>
  );
}
