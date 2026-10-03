import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OwnerNeedsForm } from "./needs-form";
import { getSessionUser } from "@/lib/auth/session";
import { BUSINESS_TYPES } from "@/lib/core/catalog/business-types";
import { SERVICE_GROUPS } from "@/lib/core/catalog/services/catalog";
import { countryOptions } from "@/lib/country-options";
import { currentCountry } from "@/lib/country-choice";
import { getOwnerNeed } from "@/lib/data/owner-needs";

export async function generateMetadata({ params }: PageProps<"/[locale]/owner/needs">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "OwnerEarly" });
  return { title: t("needs.metaTitle"), robots: { index: false } };
}

/** One screen: where the business is, what it is, what it needs and when. Saved on the client account. */
export default async function OwnerNeedsPage({ params }: PageProps<"/[locale]/owner/needs">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getSessionUser();
  if (!user || user.role !== "client") redirect(`/${locale}/owner`);
  const [t, tInd, countries, country, existing] = await Promise.all([
    getTranslations("OwnerEarly"),
    getTranslations("Industries"),
    countryOptions(locale),
    currentCountry(),
    getOwnerNeed(user.id),
  ]);
  const businessTypes = BUSINESS_TYPES.map((key) => ({ key, label: tInd(key) }));
  const serviceGroups = SERVICE_GROUPS.map((g) => ({ key: g.key, label: locale === "ar" ? g.name_ar : g.name_en }));
  return (
    <div data-testid="owner-needs">
      <p className="text-xs text-muted-foreground">
        {t("needs.signedInAs")} <bdi dir="ltr">{user.email}</bdi>
      </p>
      <h1 className="mt-1 text-2xl font-extrabold leading-tight">{t(existing ? "needs.titleEdit" : "needs.title")}</h1>
      <p className="mt-2 mb-5 text-sm leading-7 text-muted-foreground">{t("needs.intro")}</p>
      <OwnerNeedsForm
        countries={countries}
        defaultCountry={existing?.country ?? country}
        defaultCity={existing?.city}
        businessTypes={businessTypes}
        serviceGroups={serviceGroups}
        existing={existing ? { businessType: existing.businessType, services: existing.services, timing: existing.timing, whatsapp: existing.whatsapp, note: existing.note } : null}
      />
    </div>
  );
}
