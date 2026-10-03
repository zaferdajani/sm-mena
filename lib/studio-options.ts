import "server-only";
import { getLocale, getTranslations } from "next-intl/server";
import { postFormOptionsFor } from "@/lib/core/options/studio";
import { listClients } from "@/lib/data/portfolio-clients";

/** Next binding of lib/core/options/studio.ts: options for the post form, the agency's own services first. */
export async function postFormOptions(agencyServices: string[], agencyId: string) {
  const [locale, tPlat, tInd, clients] = await Promise.all([getLocale(), getTranslations("Platforms"), getTranslations("Industries"), listClients(agencyId)]);
  return postFormOptionsFor(locale, agencyServices, clients, { platforms: tPlat, industries: tInd });
}
