import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MatchChat } from "@/components/match/chat";
import { serviceAndCityOptions } from "@/lib/form-options";

export async function generateMetadata({ params }: PageProps<"/[locale]/match">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Match" });
  return pageMeta({ locale, path: "/match", title: t("title"), description: t("subtitle") });
}

export default async function MatchPage({ params }: PageProps<"/[locale]/match">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Match");
  const options = await serviceAndCityOptions();
  const starters =
    locale === "ar"
      ? ["أحتاج إدارة حساب إنستغرام لمطعم في عمّان بميزانية ٣٠٠ دينار", "إعلانات فيسبوك وإنستغرام لمتجر إلكتروني", "تصوير منتجات وريلز لمحل ملابس", "هوية بصرية لشركة ناشئة"]
      : ["Instagram management for a restaurant in Amman, 300 JOD budget", "Meta ads for an online store", "Product photos and Reels for a clothing shop", "Brand identity for a startup"];
  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="border-b px-4 py-3">
        <h1 className="font-bold">{t("title")}</h1>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </header>
      <MatchChat services={options.services} cities={options.cities} starters={starters} />
    </div>
  );
}
