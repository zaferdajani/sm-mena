import "server-only";
import { getTranslations } from "next-intl/server";
import { citiesOf } from "@/lib/countries";
import { PLATFORMS } from "@/lib/labels";
import { ROLES } from "@/lib/services/catalog";
import { allServices } from "@/lib/taxonomy";

/** Labelled options the collaboration forms share. */
export async function collabOptions(locale: string, country: string) {
  const [tCity, tPlat] = await Promise.all([getTranslations("Cities"), getTranslations("Platforms")]);
  return {
    roles: ROLES.map((r) => ({ key: r.key, label: locale === "ar" ? r.name_ar : r.name_en })),
    services: allServices.map((s) => ({ key: s.key, label: locale === "ar" ? s.name_ar : s.name_en })),
    cities: citiesOf(country).map((c) => ({ key: c.key, label: tCity(c.key) })),
    platforms: PLATFORMS.map((p) => ({ key: p, label: tPlat(p) })),
  };
}
