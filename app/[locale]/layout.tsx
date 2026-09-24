import { DirectionProvider } from "@base-ui/react/direction-provider";
import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DomGuard } from "@/components/dom-guard";
import { ErrorReporter } from "@/components/error-reporter";
import { LanguageOffer } from "@/components/language-offer";
import { PageTracker } from "@/components/page-tracker";
import { directionOf, routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: `%s · ${locale === "ar" ? "سوّق" : "Sawwiq"}` },
    description: t("description"),
    openGraph: { siteName: locale === "ar" ? "سوّق" : "Sawwiq", locale: locale === "ar" ? "ar_JO" : "en_JO", type: "website" },
    alternates: {
      languages: { ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])), "x-default": `/${routing.defaultLocale}` },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  // The offer line is written in the language it offers, so every live
  // language's three short strings are passed down (not whole dictionaries).
  const offerTexts = Object.fromEntries(
    await Promise.all(routing.locales.map(async (l) => [l, (await import(`../../messages/${l}.json`)).default.LangOffer] as const)),
  );

  return (
    <html
      lang={locale}
      dir={directionOf(locale)}
      className={`${plexArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* Tells shadcn/Base UI components (menus, sliders, tabs) which way to read. */}
        <DirectionProvider direction={directionOf(locale)}>
          <DomGuard />
          <NextIntlClientProvider>
            <LanguageOffer texts={offerTexts} />
            {children}
            <PageTracker />
          </NextIntlClientProvider>
          <ErrorReporter />
        </DirectionProvider>
      </body>
    </html>
  );
}
