import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/features/coming-soon";
import { BehanceImport } from "@/components/studio/behance-import";
import { requireAgency } from "@/lib/auth/guards";
import { featureGate } from "@/lib/feature-gate";
import { postFormOptions } from "@/lib/studio-options";
import { bookmarklet } from "@/lib/behance/handoff";
import { SITE_URL } from "@/lib/site";

/** Studio → Import from Behance (docs/47-behance-import.md). */
export default async function ImportBehancePage({ params, searchParams }: PageProps<"/[locale]/studio/import/behance">) {
  const { locale } = await params;
  const sp = await searchParams;
  const handoff = "handoff" in sp;
  const setup = sp.from === "setup";
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const gate = await featureGate("portfolio_import");
  if (gate === "off") notFound();
  if (gate === "soon") return <ComingSoon feature="portfolio_import" />;
  const t = await getTranslations("BehanceImport");
  const options = await postFormOptions(agency.services, agency.id);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
      </div>
      <BehanceImport
        handle={agency.handle}
        services={[...options.services.primary, ...options.services.other]}
        platforms={options.platforms}
        industries={options.industries}
        clients={options.clients}
        agencyServices={agency.services}
        bookmarkletHref={bookmarklet(SITE_URL, locale)}
        handoff={handoff}
        setup={setup}
      />
    </div>
  );
}
