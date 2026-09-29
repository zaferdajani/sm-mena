import { getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import { logout } from "@/app/[locale]/(auth)/actions";
import { CreatorSetupNudge } from "@/components/studio/creator-guide";
import { StudioNav } from "@/components/studio/studio-nav";
import { RegistrationNotice } from "./studio-registration";
import { Link } from "@/i18n/navigation";
import type { Agency } from "@/lib/db/schema";

export async function RegistrationStudioShell({ agency, children }: { agency: Agency; children: React.ReactNode }) {
  const [t, s, a, g] = await Promise.all([getTranslations("Registration"), getTranslations("Studio"), getTranslations("Auth"), getTranslations("CreatorSetup")]);
  return <div data-design-surface="workspace" className="sw-workspace mx-auto w-full max-w-4xl"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-bold" dir="auto">{agency.name}</p><Link href={`/a/${agency.handle}`} className="text-brand underline">{t("studio.preview")}</Link></div><form action={logout}><button className="registration-secondary" type="submit"><LogOut className="size-4" aria-hidden />{a("logout")}</button></form></div>
    <RegistrationNotice />
    <StudioNav items={[
      { href: "/studio", label: s("overview") }, { href: "/studio/setup", label: g("nav") }, { href: "/studio/profile", label: s("profile") },
      { href: "/studio/publication", label: t("studio.visibilityLink") }, { href: "/studio/new", label: t("studio.addWork") },
      { href: "/studio/posts", label: s("posts") }, { href: "/studio/packages", label: t("studio.addPackage") },
      { href: "/studio/clients", label: s("clients") }, { href: "/studio/security", label: s("security") },
    ]} />
    <div className="sw-workspace-body px-4 py-5"><CreatorSetupNudge hasWork={agency.postCount > 0} />{children}</div>
    <details className="registration-card mx-4 mb-6"><summary className="cursor-pointer font-semibold">{t("studio.archiveTitle")}</summary><p className="registration-note">{t("studio.archiveBody")}</p><nav className="registration-actions"><Link href="/studio/messages">{t("studio.archiveMessages")}</Link><Link href="/studio/contracts">{t("studio.archiveContracts")}</Link><Link href="/studio/ndas">{t("studio.archiveNdas")}</Link><Link href="/studio/notifications">{t("studio.archiveNotifications")}</Link></nav></details>
  </div>;
}
