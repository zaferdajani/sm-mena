import { RegistrationFooter } from "@/components/registration/registration-view";
import { isRegistrationPhase } from "@/lib/launch-phase";
import { getLocale, getTranslations } from "next-intl/server";
import { OtherLanguageLink } from "@/components/other-language-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { ReleaseStamp } from "@/components/release-stamp";
import { Link } from "@/i18n/navigation";
import { serviceLinkText } from "@/lib/hire-content";

export const FOOTER_SERVICES = ["smm_management", "ads_meta", "smm_content", "seo", "web_design", "brand_identity", "photography", "video_production"] as const;

/** Retain crawlable service/trust links, with an explicit quiet footer boundary. */
export async function SiteFooter() {
  if (isRegistrationPhase()) return <RegistrationFooter />;
  const locale = await getLocale();
  const t = await getTranslations("Footer");
  const th = await getTranslations("Hire");
  const tHead = await getTranslations("Header");
  return (
    <footer className="mx-auto mt-10 w-full max-w-5xl border-t bg-muted/30 px-4 py-6 text-sm sm:px-6" data-testid="site-footer">
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section>
          <h2 className="mb-3 font-semibold">{t("hireTitle")}</h2>
          <ul className="grid grid-cols-2 gap-x-5 gap-y-2 text-muted-foreground">
            {FOOTER_SERVICES.map((s) => (
              <li key={s}><Link href={`/hire/${s}`} className="hover:text-foreground hover:underline">{serviceLinkText(s, locale)}</Link></li>
            ))}
            <li className="col-span-2"><Link href="/hire" className="font-medium text-brand hover:underline">{th("indexTitle")}</Link></li>
          </ul>
        </section>
        <section className="border-t pt-5 lg:border-s lg:border-t-0 lg:ps-6 lg:pt-0">
          <h2 className="mb-3 font-semibold">{t("aboutTitle")}</h2>
          <ul className="grid grid-cols-2 gap-x-5 gap-y-2 text-muted-foreground">
            <li><Link href="/about" className="hover:underline">{t("about")}</Link></li>
            <li><Link href="/contact" className="hover:underline">{t("contact")}</Link></li>
            <li><Link href="/join" className="hover:underline">{t("forAgencies")}</Link></li>
            <li><Link href="/who-runs" className="hover:underline">{t("whoRuns")}</Link></li>
            <li><Link href="/sawwiq50" className="hover:underline">{t("top")}</Link></li>
            <li><Link href="/legal" className="hover:underline">{t("legal")}</Link></li>
            <li><Link href="/support" className="hover:underline">{t("report")}</Link></li>
            <li><OtherLanguageLink label={t("otherLanguage")} className="hover:underline" /></li>
            <li className="md:hidden"><ThemeToggle labels={{ dark: tHead("themeDark"), light: tHead("themeLight") }} withText className="-mx-2 w-fit px-2 py-1" /></li>
          </ul>
        </section>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <p className="text-xs text-muted-foreground">{t("rights", { year: new Date().getFullYear() })}</p>
        <ReleaseStamp />
      </div>
    </footer>
  );
}
