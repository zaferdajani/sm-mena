import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { serviceLinkText } from "@/lib/hire-content";

/** The services people search for most in Jordan; each links to its hire page. */
export const FOOTER_SERVICES = ["smm_management", "ads_meta", "smm_content", "seo", "web_design", "brand_identity", "photography", "video_production"] as const;

/**
 * Every page links to the hire hubs and the trust pages, so no page is an
 * orphan and the anchor text is the phrase people search (the OneClickConvert
 * footer rule). Also carries a plain link to the other language's home page.
 */
export async function SiteFooter() {
  const locale = await getLocale();
  const t = await getTranslations("Footer");
  const th = await getTranslations("Hire");
  const other = locale === "ar" ? "en" : "ar";
  return (
    <footer className="mx-auto mt-10 w-full max-w-4xl border-t px-4 py-8 text-sm" data-testid="site-footer">
      <div className="grid gap-8 sm:grid-cols-[2fr_1fr]">
        <section>
          <h2 className="mb-3 font-semibold">{t("hireTitle")}</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-muted-foreground">
            {FOOTER_SERVICES.map((s) => (
              <li key={s}>
                <Link href={`/hire/${s}`} className="hover:text-foreground hover:underline">
                  {serviceLinkText(s, locale)}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/hire" className="font-medium text-brand hover:underline">
                {th("indexTitle")}
              </Link>
            </li>
          </ul>
        </section>
        <section>
          <h2 className="mb-3 font-semibold">{t("aboutTitle")}</h2>
          <ul className="grid gap-2 text-muted-foreground">
            <li><Link href="/about" className="hover:text-foreground hover:underline">{t("about")}</Link></li>
            <li><Link href="/contact" className="hover:text-foreground hover:underline">{t("contact")}</Link></li>
            <li><Link href="/join" className="hover:text-foreground hover:underline">{t("forAgencies")}</Link></li>
            <li><Link href="/legal" className="hover:text-foreground hover:underline">{t("legal")}</Link></li>
            <li>
              <Link href="/" locale={other} hrefLang={other} className="hover:text-foreground hover:underline">
                {t("otherLanguage")}
              </Link>
            </li>
          </ul>
        </section>
      </div>
      <p className="mt-8 text-xs text-muted-foreground">{t("rights", { year: new Date().getFullYear() })}</p>
    </footer>
  );
}
