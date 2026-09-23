import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { logout } from "@/app/[locale]/(auth)/actions";
import { StudioNav } from "@/components/studio/studio-nav";
import { requireAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const t = await getTranslations("Admin");
  const ta = await getTranslations("Auth");
  const tr = await getTranslations("Reviews");
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex items-center justify-between px-4 pt-4 sm:pt-8">
        <div>
          <h1 className="text-lg font-bold">{t("title")}</h1>
          <p className="text-xs text-muted-foreground" dir="ltr">{user.email}</p>
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
            { href: "/admin", label: t("dashboard") },
            { href: "/admin/agencies", label: t("agencies") },
            { href: "/admin/reports", label: t("reports") },
            { href: "/admin/reviews", label: tr("admin.title") },
            { href: "/admin/promotions", label: t("promotions") },
          ]}
        />
      </div>
      <div className="px-4 py-5">{children}</div>
    </div>
  );
}
