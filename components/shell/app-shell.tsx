import { LifeBuoy, LogIn } from "lucide-react";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { CountryPicker } from "@/components/country-picker";
import { DemoBanner } from "@/components/demo/demo-banner";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { HeaderBell } from "@/components/notifications/header-bell";
import { InterfaceBackground } from "@/components/theme/interface-background";
import { Link } from "@/i18n/navigation";
import { isStaffRole } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { chosenCountry, currentCountry } from "@/lib/country-choice";
import { COUNTRIES } from "@/lib/countries";
import { BottomNav, SideNav, type NavItem } from "./nav-links";
import { SiteFooter } from "./site-footer";
import { canUse } from "@/lib/feature-gate";

/** Instagram-like shell: side navigation on desktop, top bar + bottom tabs on phones. */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Nav");
  const th = await getTranslations("Header");
  const tf = await getTranslations("Footer");
  const user = await getSessionUser();
  const locale = await getLocale();
  // Admin → Features decides which sections appear in the navigation.
  const [country, chosen, matchOpen] = await Promise.all([currentCountry(), chosenCountry(), canUse("ai_matchmaker")]);
  const themeLabels = { dark: th("themeDark"), light: th("themeLight") };
  const picker = (
    <CountryPicker
      current={country}
      chosen={chosen !== null}
      options={COUNTRIES.map((c) => ({ code: c.code, name: locale === "ar" ? c.ar : c.en, flag: c.flag }))}
      label={th("country")}
      locateLabel={th("useLocation")}
    />
  );

  const items: NavItem[] = [
    { href: "/feed", label: t("home"), icon: "home" },
    { href: "/explore", label: t("explore"), icon: "explore" },
    ...(matchOpen ? [{ href: "/match", label: t("match"), icon: "match" } as NavItem] : []),
    { href: "/saved", label: t("saved"), icon: "saved" },
    isStaffRole(user?.role)
      ? { href: "/admin", label: t("admin"), icon: "admin" }
      : user
        ? { href: "/studio", label: t("studio"), icon: "studio" }
        : { href: "/join", label: t("join"), icon: "join" },
  ];

  return (
    <div className="min-h-dvh md:flex">
      <InterfaceBackground />
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-e px-3 py-6 md:flex">
        <Link href="/" className="mb-8 flex items-center gap-2 px-3 font-heading text-2xl font-bold text-brand" translate="no">
          <Image src="/brand/mark-192.png" alt="" width={32} height={32} className="rounded-lg" priority />
          {th("brand")}
        </Link>
        <nav aria-label={t("menu")}>
          <SideNav
            items={[
              ...items.slice(0, 3),
              { href: "/hire", label: t("hire"), icon: "hire" },
              ...items.slice(3),
              ...(user ? [] : [{ href: "/login", label: t("login"), icon: "login" } as NavItem]),
            ]}
          />
          <HeaderBell variant="row" />
        </nav>
        <div className="mt-auto grid gap-3 px-3 text-xs text-muted-foreground">
          {picker}
          <ThemeToggle labels={themeLabels} withText className="-mx-2 w-fit px-2" />
          <LocaleSwitcher label={th("switchLocale")} ariaLabel={th("switchLocaleLabel")} />
          <Link href="/support" className="hover:underline" data-testid="report-problem">
            {tf("report")}
          </Link>
          <Link href="/legal" className="hover:underline">
            {tf("legal")}
          </Link>
          <p>{tf("rights", { year: new Date().getFullYear() })}</p>
        </div>
      </aside>

      <header data-app-header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-4 py-2.5 backdrop-blur md:hidden">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-heading text-xl font-bold text-brand" translate="no">
          <Image src="/brand/mark-192.png" alt="" width={28} height={28} className="rounded-md" priority />
          {th("brand")}
        </Link>
        <div className="flex min-w-0 items-center gap-1">
          {picker}
          <HeaderBell />
          {user ? (
            <Link href="/support" aria-label={tf("report")} className="rounded-md p-2 text-muted-foreground hover:bg-muted">
              <LifeBuoy className="size-5" />
            </Link>
          ) : (
            // Signed out: sign-in takes the support icon's place (support stays in the footer).
            <Link href="/login" aria-label={t("login")} className="rounded-md p-2 text-muted-foreground hover:bg-muted" data-testid="header-login">
              <LogIn className="size-5" />
            </Link>
          )}
          <LocaleSwitcher label={th("switchLocale")} ariaLabel={th("switchLocaleLabel")} />
        </div>
      </header>

      <main className="min-w-0 flex-1 pb-20 md:pb-10">
        <DemoBanner />
        {children}
        <SiteFooter />
      </main>

      <nav data-app-nav aria-label={t("menu")} className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <BottomNav items={items} />
      </nav>
    </div>
  );
}
