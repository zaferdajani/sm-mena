import { DirectionProvider } from "@base-ui/react/direction-provider";
import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Arabic, Readex_Pro } from "next/font/google";
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
import { themeScript } from "@/components/theme-toggle";
import { directionOf, routing } from "@/i18n/routing";
import { brandOf, defaultOgImage, siteIndexable } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

// Display face for headings, from the landing site's identity.
const readex = Readex_Pro({
  variable: "--font-readex",
  subsets: ["arabic", "latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  // Headings swap in when ready; only the body face is preloaded, so fewer
  // font files compete with the first paint on phones.
  preload: false,
});

// Amounts, dates and handles.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
  preload: false,
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
    title: { default: t("title"), template: `%s · ${brandOf(locale)}` },
    description: t("description"),
    // No site-wide canonical or hreflang here: each public page declares its
    // own through pageMeta() (lib/seo.ts), and private pages must not inherit
    // the home page's language pairs.
    openGraph: { siteName: brandOf(locale), locale: locale === "ar" ? "ar_JO" : "en_JO", type: "website", images: [defaultOgImage(locale)] },
    twitter: { card: "summary_large_image" },
    ...(siteIndexable() ? {} : { robots: { index: false, follow: false } }),
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
      other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
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
  // Service tags approved by an admin (on top of the built-in catalog), for server and browser.
  const approvedTags = await customTags();
  const offerTexts = Object.fromEntries(
    await Promise.all(routing.locales.map(async (l) => [l, (await import(`../../messages/${l}.json`)).default.LangOffer] as const)),
  );

  return (
    <html
      lang={locale}
      dir={directionOf(locale)}
      className={`${plexArabic.variable} ${readex.variable} ${plexMono.variable} h-full antialiased`}
      // The head script may set data-theme="dark" before React loads.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        {/* Tells shadcn/Base UI components (menus, sliders, tabs) which way to read. */}
        <DirectionProvider direction={directionOf(locale)}>
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
