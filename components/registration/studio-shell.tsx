import { getTranslations } from "next-intl/server";
import { LogOut, Plus } from "lucide-react";
import { SwissWorkspace } from "@/components/layout/swiss-workspace";
import { logout } from "@/app/[locale]/(auth)/actions";
import { StudioNav } from "@/components/studio/studio-nav";
import { RegistrationNotice } from "./studio-registration";
import { Link } from "@/i18n/navigation";
import type { Agency } from "@/lib/db/schema";

// Day one in the Studio (docs/65): four tabs, one "Add work" button, the rest under "More".
export async function RegistrationStudioShell({ agency, children }: { agency: Agency; children: React.ReactNode }) {
  const [t, s, a, g] = await Promise.all([getTranslations("Registration"), getTranslations("Studio"), getTranslations("Auth"), getTranslations("CreatorSetup")]);
  return <SwissWorkspace><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-bold" dir="auto">{agency.name}</p><Link href={`/a/${agency.handle}`} className="text-brand underline">{t("studio.preview")}</Link></div>
      <div className="flex items-center gap-2"><Link href={agency.postCount ? "/studio/new" : "/portfolio-setup"} className="sw-invitation-cta inline-flex items-center gap-1.5" data-testid="studio-add-work"><Plus className="size-4" aria-hidden />{s("nav.addWork")}</Link><form action={logout}><button className="registration-secondary" type="submit"><LogOut className="size-4" aria-hidden />{a("logout")}</button></form></div></div>
    <RegistrationNotice />
    <StudioNav
      items={[{ href: "/studio", label: s("nav.home") }, { href: "/studio/posts", label: s("nav.work") }, { href: "/studio/profile", label: s("nav.page") }, { href: "/studio/security", label: s("nav.account") }]}
      more={[
        { href: "/studio/publication", label: t("studio.visibilityLink") }, { href: "/studio/packages", label: t("studio.addPackage") }, { href: "/studio/clients", label: s("clients") },
        { href: "/studio/import", label: s("nav.import") }, { href: "/studio/setup", label: g("nav") },
        { href: "/studio/messages", label: t("studio.archiveMessages") }, { href: "/studio/contracts", label: t("studio.archiveContracts") }, { href: "/studio/ndas", label: t("studio.archiveNdas") }, { href: "/studio/notifications", label: t("studio.archiveNotifications") },
      ]}
      moreLabel={s("nav.more")}
    />
    <div className="sw-workspace-body py-6">{children}</div>
  </SwissWorkspace>;
}
