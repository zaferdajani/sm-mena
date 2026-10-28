import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/features/coming-soon";
import { BehanceImport } from "@/components/studio/behance-import";
import { requireAgency } from "@/lib/auth/guards";
import { featureGate } from "@/lib/feature-gate";
import { postFormOptions } from "@/lib/studio-options";
import { bookmarklet } from "@/lib/behance/handoff";
import { SITE_URL } from "@/lib/site";
import { SocialIcon } from "@/components/social-icon";
import { linkHref } from "@/lib/social-links";

/** Studio → Import from Behance (docs/47-behance-import.md). */
export default async function ImportBehancePage({ params, searchParams }: PageProps<"/[locale]/studio/import/behance">) {
  const { locale } = await params;
  const handoff = "handoff" in (await searchParams);
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const gate = await featureGate("portfolio_import");
  if (gate === "off") notFound();
  if (gate === "soon") return <ComingSoon feature="portfolio_import" />;
  const t = await getTranslations("BehanceImport");
  const options = await postFormOptions(agency.services, agency.id);
  const saved = (agency.socialLinks ?? []).find((l) => l.kind === "behance");
  const savedUrl = saved ? (linkHref("behance", saved.value) ?? "") : "";
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold"><SocialIcon kind="behance" className="size-7" />{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
      </div>
      <BehanceImport
        handle={agency.handle}
        savedUrl={savedUrl}
        services={[...options.services.primary, ...options.services.other]}
        platforms={options.platforms}
        industries={options.industries}
        clients={options.clients}
        agencyServices={agency.services}
        bookmarkletHref={bookmarklet(SITE_URL, locale)}
        handoff={handoff}
      />
    </div>
  );
}
