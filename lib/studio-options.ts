import "server-only";
import { getLocale, getTranslations } from "next-intl/server";
import { listClients } from "@/lib/data/portfolio-clients";
import { INDUSTRIES, PLATFORMS } from "@/lib/labels";
import { allServices } from "@/lib/taxonomy";

/** Options for the post form: the agency's own services first. */
export async function postFormOptions(agencyServices: string[], agencyId: string) {
  const locale = await getLocale();
  const [tPlat, tInd] = await Promise.all([getTranslations("Platforms"), getTranslations("Industries")]);
  const toOption = (s: (typeof allServices)[number]) => ({ key: s.key, label: locale === "ar" ? s.name_ar : s.name_en });
  return {
    services: {
      primary: allServices.filter((s) => agencyServices.includes(s.key)).map(toOption),
      other: allServices.filter((s) => !agencyServices.includes(s.key)).map(toOption),
    },
    platforms: PLATFORMS.map((key) => ({ key, label: tPlat(key) })),
    industries: INDUSTRIES.map((key) => ({ key, label: tInd(key) })),
    clients: (await listClients(agencyId)).map((c) => ({ key: c.id, label: c.name })),
  };
}
