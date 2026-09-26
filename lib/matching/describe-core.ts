import { countryName } from "@/lib/countries";
import { formatJod } from "@/lib/format";
import { serviceLabel } from "@/lib/labels";
import type { Difference } from "./closeness";

export type DiffLine = { status: "met" | "partly" | "missing" | "unknown"; text: string };

type Vals = Record<string, string | number>;
export type DiffTranslators = {
  /** Keys of the "Closest.diff" messages. */
  t: (key: string, values?: Vals) => string;
  city: (key: string) => string;
  platform: (key: string) => string;
  industry: (key: string) => string;
};

/**
 * The differences between what was asked and what an agency has, as short
 * lines in the reader's language (docs/35). Shared by the server (Explore,
 * hire pages) and the matchmaker's cards in the browser; met requirements
 * come first, then the gaps.
 */
export function diffLines(differences: Difference[], locale: string, currency: string, tr: DiffTranslators): DiffLine[] {
  const lang = locale === "ar" ? "ar" : "en";
  const list = (xs: string[], type: "conjunction" | "disjunction" = "conjunction") => new Intl.ListFormat(lang, { style: "long", type }).format(xs);
  const svc = (xs: string[], type?: "conjunction" | "disjunction") => list(xs.map((s) => serviceLabel(s, lang)), type);
  const money = (n: number) => formatJod(n, lang, currency);
  const { t } = tr;
  const lines: DiffLine[] = [];
  for (const d of differences) {
    switch (d.key) {
      case "services":
        if (d.offered.length) lines.push({ status: "met", text: t("servicesOffered", { services: svc(d.offered) }) });
        if (d.missing.length) lines.push({ status: "missing", text: t("servicesMissing", { services: svc(d.missing, "disjunction") }) });
        if (d.related.length) lines.push({ status: "partly", text: t("servicesRelated", { services: svc(d.related) }) });
        break;
      case "location":
        if (d.status === "met") lines.push({ status: "met", text: d.wantedCity ? t("inCity", { city: tr.city(d.city) }) : t("inCountry", { country: countryName(d.country, lang) }) });
        else if (d.country === d.wantedCountry) lines.push({ status: "partly", text: t("otherCity", { city: tr.city(d.city), wanted: tr.city(d.wantedCity ?? d.city) }) });
        else if (d.serves) lines.push({ status: "partly", text: t("servesCountry", { country: countryName(d.country, lang), wanted: countryName(d.wantedCountry, lang) }) });
        else lines.push({ status: "missing", text: t("elsewhere", { country: countryName(d.country, lang), wanted: countryName(d.wantedCountry, lang) }) });
        break;
      case "budget":
        if (d.status === "unknown" || d.price === null) lines.push({ status: "unknown", text: t("priceUnknown") });
        else if (d.status === "met") lines.push({ status: "met", text: t("withinBudget", { price: money(d.price) }) });
        else if (d.over > 0) lines.push({ status: d.status, text: t("overBudget", { price: money(d.price), over: money(d.over), max: money(d.max ?? 0) }) });
        else lines.push({ status: "partly", text: t("belowMin", { min: money(d.min ?? 0) }) });
        break;
      case "platforms":
        if (d.offered.length) lines.push({ status: "met", text: t("platformsOffered", { platforms: list(d.offered.map(tr.platform)) }) });
        if (d.missing.length) lines.push({ status: "missing", text: t("platformsMissing", { platforms: list(d.missing.map(tr.platform)) }) });
        break;
      case "industry":
        lines.push({ status: d.status, text: t(d.status === "met" ? "industryMet" : "industryMissing", { industry: tr.industry(d.industry) }) });
        break;
      case "fullService":
        lines.push({ status: d.status, text: d.status === "met" ? t("fullServiceMet") : t("fullServicePartly", { count: d.groups }) });
        break;
      case "verified":
        lines.push({ status: d.status, text: t(d.status === "met" ? "verifiedMet" : "verifiedMissing") });
        break;
    }
  }
  const order = { met: 0, partly: 1, unknown: 2, missing: 3 } as const;
  return lines.sort((a, b) => order[a.status] - order[b.status]);
}
