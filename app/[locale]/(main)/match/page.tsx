import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MatchChat } from "@/components/match/chat";
import { aiEnabled } from "@/lib/ai/agent";
import { currentCountry } from "@/lib/country-choice";
import { serviceAndCityOptions } from "@/lib/form-options";
import { groupPriceStats } from "@/lib/matching/prices";

export async function generateMetadata({ params }: PageProps<"/[locale]/match">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Match" });
  return pageMeta({ locale, path: "/match", title: t("title"), description: t("subtitle") });
}

export default async function MatchPage({ params }: PageProps<"/[locale]/match">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Match");
  const country = await currentCountry();
  // Budget choices come from real prices in the visitor's country when there are enough.
  const [options, priceStats] = await Promise.all([serviceAndCityOptions(), groupPriceStats(country).catch(() => ({}))]);
  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="border-b px-4 py-3">
        <h1 className="font-bold">{t("title")}</h1>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </header>
      <MatchChat services={options.services} cities={options.cities} platforms={options.platforms} country={country} priceStats={priceStats} aiMode={aiEnabled()} />
    </div>
  );
}
