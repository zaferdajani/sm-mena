import { DirectionProvider } from "@base-ui/react/direction-provider";
import type { Metadata } from "next";
import { Noto_Sans_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DomGuard } from "@/components/dom-guard";
import { ErrorReporter } from "@/components/error-reporter";
import { LanguageOffer } from "@/components/language-offer";
import { FlagPolyfill } from "@/components/flag-polyfill";
import { ServiceRegistry } from "@/components/service-registry";
import { customTags } from "@/lib/services/tags";
import { PageTracker } from "@/components/page-tracker";
import { ThemeSync } from "@/components/theme-sync";
import { themeScript } from "@/lib/theme";
import { directionOf, routing } from "@/i18n/routing";
import { brandOf, defaultOgImage, siteIndexable } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import "../globals.css";
import "../styles/registration.css";
import "../styles/brochure.css";
import "../styles/brochure-responsive.css";

// Approved reference: Sawwiq_Saudi_Brochure_Corrected.pdf.
// One self-hosted variable family for all Arabic/Latin UI text and headings.
const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic", "latin"],
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: `%s · ${brandOf(locale)}` },
    description: t("description"),
    // Public pages set their own canonical and language pairs; private pages do not inherit them.
    openGraph: { siteName: brandOf(locale), locale: locale === "ar" ? "ar_JO" : "en_JO", type: "website", images: [defaultOgImage(locale)] },
    twitter: { card: "summary_large_image" },
    ...(siteIndexable() ? {} : { robots: { index: false, follow: false } }),
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
      other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const approvedTags = await customTags();
  const offerTexts = Object.fromEntries(
    await Promise.all(routing.locales.map(async (l) => [l, (await import(`../../messages/${l}.json`)).default.LangOffer] as const)),
  );

  return (
    <html lang={locale} dir={directionOf(locale)} className={`${notoArabic.variable} h-full antialiased`} data-design-system="brochure-v1" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-full">
        <DirectionProvider direction={directionOf(locale)}>
          <ThemeSync />
          <DomGuard />
          <NextIntlClientProvider>
            <ServiceRegistry tags={approvedTags} />
            <LanguageOffer texts={offerTexts} />
            {children}
            <PageTracker />
            <FlagPolyfill />
          </NextIntlClientProvider>
          <ErrorReporter />
        </DirectionProvider>
      </body>
    </html>
  );
}
