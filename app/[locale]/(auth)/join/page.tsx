import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CITIES } from "@/lib/labels";
import { JoinForm } from "./join-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/join">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return pageMeta({ locale, path: "/join", title: t("joinTitle"), description: t("joinSubtitle") });
}

export default async function JoinPage({ params }: PageProps<"/[locale]/join">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");
  const tc = await getTranslations("Cities");
  const cities = CITIES.map((key) => ({ key, label: tc(key) }));
  return (
    <>
      <h1 className="text-xl font-bold">{t("joinTitle")}</h1>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">{t("joinSubtitle")}</p>
      <JoinForm cities={cities} />
      <p className="mt-5 text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-brand">
          {t("loginLink")}
        </Link>
      </p>
    </>
  );
}
