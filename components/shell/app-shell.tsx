import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { BottomNav, SideNav, type NavItem } from "./nav-links";

/** Instagram-like shell: side navigation on desktop, top bar + bottom tabs on phones. */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Nav");
  const th = await getTranslations("Header");
  const tf = await getTranslations("Footer");
  const user = await getSessionUser();

  const items: NavItem[] = [
    { href: "/", label: t("home"), icon: "home" },
    { href: "/explore", label: t("explore"), icon: "explore" },
    { href: "/saved", label: t("saved"), icon: "saved" },
    user?.role === "admin"
      ? { href: "/admin", label: t("admin"), icon: "admin" }
      : user
        ? { href: "/studio", label: t("studio"), icon: "studio" }
        : { href: "/join", label: t("join"), icon: "join" },
  ];

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-e px-3 py-6 md:flex">
        <Link href="/" className="mb-8 px-3 text-2xl font-bold text-brand">
          {th("brand")}
        </Link>
        <nav aria-label={t("menu")}>
          <SideNav items={[...items.slice(0, 2), { href: "/hire", label: t("hire"), icon: "hire" }, ...items.slice(2)]} />
        </nav>
        <div className="mt-auto grid gap-3 px-3 text-xs text-muted-foreground">
          <LocaleSwitcher label={th("switchLocale")} ariaLabel={th("switchLocaleLabel")} />
          <Link href="/legal" className="hover:underline">
            {tf("legal")}
          </Link>
          <p>{tf("rights", { year: new Date().getFullYear() })}</p>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-4 py-2.5 backdrop-blur md:hidden">
        <Link href="/" className="text-xl font-bold text-brand">
          {th("brand")}
        </Link>
        <LocaleSwitcher label={th("switchLocale")} ariaLabel={th("switchLocaleLabel")} />
      </header>

      <main className="min-w-0 flex-1 pb-20 md:pb-10">{children}</main>

      <nav aria-label={t("menu")} className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <BottomNav items={items} />
      </nav>
    </div>
  );
}
