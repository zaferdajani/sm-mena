import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { logout } from "@/app/[locale]/(auth)/actions";
import { StudioNav } from "@/components/studio/studio-nav";
import { requireAdmin } from "@/lib/auth/guards";
import { can, type Permission } from "@/lib/auth/permissions";
import { bugBadge } from "@/lib/data/bugs";
import { pendingTagCount } from "@/lib/services/tags";

export const metadata: Metadata = { robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // allowEnroll: the layout renders for /admin/security too; every page and action checks again.
  const user = await requireAdmin({ allowEnroll: true });
  const [bugs, pendingServices] = await Promise.all([bugBadge(), pendingTagCount()]);
  const t = await getTranslations("Admin");
  const ta = await getTranslations("Auth");
  const tr = await getTranslations("Reviews");
  const tt = await getTranslations("AdminTeam");
  const tp = await getTranslations("Appearance");
  const tchat = await getTranslations("Chat");
  const ts = await getTranslations("AdminServices");
  // Each person sees only the sections their role allows (pages check again on the server).
  const nav: { href: string; label: string; badge?: number; perm: Permission }[] = [
    { href: "/admin", label: t("dashboard"), perm: "dashboard.view" },
    { href: "/admin/stats", label: t("statistics"), perm: "stats.view" },
    { href: "/admin/payments", label: t("payments"), perm: "payments.view" },
    { href: "/admin/bugs", label: t("bugs"), badge: bugs, perm: "support.manage" },
    { href: "/admin/agencies", label: t("agencies"), perm: "agencies.view" },
    { href: "/admin/services", label: ts("nav"), badge: pendingServices, perm: "agencies.moderate" },
    { href: "/admin/reports", label: t("reports"), perm: "content.moderate" },
    { href: "/admin/reviews", label: tr("admin.title"), perm: "content.moderate" },
    { href: "/admin/conversations", label: tchat("admin.nav"), perm: "conversations.view" },
    { href: "/admin/promotions", label: t("promotions"), perm: "promotions.manage" },
    { href: "/admin/users", label: t("users"), perm: "users.view" },
    { href: "/admin/team", label: tt("nav"), perm: "staff.manage" },
    { href: "/admin/appearance", label: tp("nav"), perm: "appearance.manage" },
    { href: "/admin/audit", label: t("audit"), perm: "audit.view" },
    { href: "/admin/security", label: t("security"), perm: "dashboard.view" },
  ];
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex items-center justify-between px-4 pt-4 sm:pt-8">
        <div>
          <h1 className="text-lg font-bold">{t("title")}</h1>
          <p className="text-xs text-muted-foreground">
            <span dir="ltr">{user.email}</span> · <span data-testid="staff-role">{tt(`roles.${user.role as "owner"}.name`)}</span>
          </p>
        </div>
        <form action={logout}>
          <button type="submit" className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
            <LogOut className="size-4 rtl:-scale-x-100" />
            {ta("logout")}
          </button>
        </form>
      </div>
      <div className="mt-3">
        <StudioNav items={nav.filter((i) => can(user.role, i.perm)).map(({ href, label, badge }) => ({ href, label, badge }))} />
      </div>
      <div className="px-4 py-5">{children}</div>
    </div>
  );
}
