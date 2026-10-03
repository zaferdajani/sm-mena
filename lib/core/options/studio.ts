import { INDUSTRIES, PLATFORMS } from "@/lib/core/catalog/labels";
import { allServices } from "@/lib/core/catalog/taxonomy";
import type { Translate } from "./translate";

export type Option = { key: string; label: string };

/** Options for the post form: the agency's own services first. Pure: translators and the client list come in. */
export function postFormOptionsFor(locale: string, agencyServices: string[], clients: { id: string; name: string }[], t: { platforms: Translate; industries: Translate }) {
  const toOption = (s: (typeof allServices)[number]): Option => ({ key: s.key, label: locale === "ar" ? s.name_ar : s.name_en });
  return {
    services: {
      primary: allServices.filter((s) => agencyServices.includes(s.key)).map(toOption),
      other: allServices.filter((s) => !agencyServices.includes(s.key)).map(toOption),
    },
    platforms: PLATFORMS.map((key) => ({ key, label: t.platforms(key) })),
    industries: INDUSTRIES.map((key) => ({ key, label: t.industries(key) })),
    clients: clients.map((c): Option => ({ key: c.id, label: c.name })),
  };
}
