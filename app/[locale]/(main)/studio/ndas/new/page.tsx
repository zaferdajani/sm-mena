import { getTranslations, setRequestLocale } from "next-intl/server";
import { NdaForm } from "@/components/ndas/nda-form";
import { requireAgency } from "@/lib/auth/guards";
import { countryName } from "@/lib/countries";
import { featureGate } from "@/lib/feature-gate";
import { ComingSoon } from "@/components/features/coming-soon";
import { notFound } from "next/navigation";

export default async function NewNda({ params }: PageProps<"/[locale]/studio/ndas/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const gate = await featureGate("ndas");
  if (gate === "off") notFound();
  if (gate === "soon") return <ComingSoon feature="ndas" />;
  const t = await getTranslations("Agreements.ndaStudio");
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("newTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("newIntro")}</p>
      </div>
      <NdaForm agencyName={agency.name} countryName={countryName(agency.country, locale)} />
    </div>
  );
}
