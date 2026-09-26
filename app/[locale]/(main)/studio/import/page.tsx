import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/features/coming-soon";
import { PortfolioImport } from "@/components/studio/portfolio-import";
import { requireAgency } from "@/lib/auth/guards";
import { featureGate } from "@/lib/feature-gate";
import { aiImportAvailable } from "@/lib/portfolio-import/ai";
import { postFormOptions } from "@/lib/studio-options";

/** Studio → Import a PDF portfolio (docs/36-portfolio-import.md). */
export default async function ImportPortfolioPage({ params }: PageProps<"/[locale]/studio/import">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const gate = await featureGate("portfolio_import");
  if (gate === "off") notFound();
  if (gate === "soon") return <ComingSoon feature="portfolio_import" />;
  const t = await getTranslations("PortfolioImport");
  const options = await postFormOptions(agency.services, agency.id);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
      </div>
      <PortfolioImport
        services={[...options.services.primary, ...options.services.other]}
        platforms={options.platforms}
        industries={options.industries}
        agencyServices={agency.services}
        aiAvailable={aiImportAvailable()}
      />
    </div>
  );
}
