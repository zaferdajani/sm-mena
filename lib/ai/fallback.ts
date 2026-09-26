import "server-only";
import { createTranslator } from "next-intl";
import { citiesOf, countryOf, DEFAULT_COUNTRY, isCountryCode, type CountryCode } from "@/lib/countries";
import { serviceLabel } from "@/lib/labels";
import { findMatches, marketPrices } from "@/lib/matching";
import { closestAsMatches } from "@/lib/matching/closest";
import { scopedCountry, scopedIncludeDemo } from "@/lib/matching/scope";
import { emptyNeed, exampleBudget, formatAmount, mergeText, nextStep, resolveServices, skipRest, type WizardNeed } from "@/lib/match-wizard";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import { extractNeed, isArabic } from "./extract";
import type { ChatMessage, MatchResponse } from "./types";

// Rule-based matchmaker used when no AI provider is configured or every
// configured provider failed. The keyword rules live in ./extract.ts.
export { extractNeed, isArabic };

/** The visitor's country for this turn (set by runMatchmaker), Jordan outside a request. */
export const turnCountry = (): CountryCode => {
  const c = scopedCountry();
  return isCountryCode(c) ? c : DEFAULT_COUNTRY;
};

const translator = (lang: "ar" | "en") => createTranslator({ locale: lang, messages: lang === "ar" ? ar : en, namespace: "MatchWizard" });

/** Example briefs in the visitor's country: its capital and currency. */
export function examples(country: CountryCode, lang: "ar" | "en") {
  const t = translator(lang);
  const c = countryOf(country);
  const city = lang === "ar" ? c.cities[0].ar : c.cities[0].en;
  const budget = formatAmount(exampleBudget(c.currency), lang, c.currency);
  return [t("fallback.example1", { city }), t("fallback.example2", { budget }), t("fallback.example3"), t("fallback.example4")];
}

/**
 * One turn of the rule-based matchmaker. With `wizard` (the guided chat's
 * answers so far) the last message fills in or changes answers; `picked`
 * means it was a tapped choice the wizard already applied. Without it, the
 * whole conversation is read as one brief (the classic chat).
 */
export async function basicMatchmaker(history: ChatMessage[], locale: string, wizard?: WizardNeed, picked = false): Promise<MatchResponse> {
  const users = history.filter((m) => m.role === "user");
  const last = users.at(-1)?.content ?? "";
  const lang: "ar" | "en" = (last && !picked ? isArabic(last) : locale === "ar") ? "ar" : "en";
  const t = translator(lang);
  const country = turnCountry();
  const c = countryOf(country);
  const countryLabel = lang === "ar" ? c.ar : c.en;
  const cityLabel = (key: string | null) => {
    const city = key ? citiesOf(country).find((x) => x.key === key) : null;
    return city ? (lang === "ar" ? city.ar : city.en) : null;
  };
  const money = (n: number) => formatAmount(n, lang, c.currency);

  const said = picked ? null : extractNeed(last, country);
  let need: WizardNeed;
  if (wizard) {
    need = said ? mergeText(wizard, said) : wizard;
    // A brief typed at the first question ("Instagram for my café in Jeddah")
    // goes straight to matches, as in the classic chat; later text keeps the
    // questions going.
    const firstQuestion = !wizard.groups.length && !wizard.services.length;
    if (firstQuestion && said?.services.length) need = skipRest(need);
  } else {
    need = mergeText(emptyNeed(), extractNeed(users.map((m) => m.content).join(" \n "), country));
  }

  // A city or country elsewhere in the latest message: ask before switching.
  if (said?.elsewhere) {
    const other = countryOf(said.elsewhere.country);
    const otherCity = said.elsewhere.city ? other.cities.find((x) => x.key === said.elsewhere!.city) : null;
    const otherLabel = lang === "ar" ? other.ar : other.en;
    return {
      mode: "basic",
      provider: "basic",
      recommendation: null,
      reply: otherCity
        ? t("fallback.switchAsk", { city: lang === "ar" ? otherCity.ar : otherCity.en, other: otherLabel, country: countryLabel })
        : t("fallback.switchAskCountry", { other: otherLabel, country: countryLabel }),
      suggestions: [],
      need: wizard ? need : undefined,
      countrySwitch: { country: other.code, city: otherCity?.key ?? null },
    };
  }

  if (wizard) {
    if (nextStep(need) !== "results") {
      const items = said ? acknowledged(need, wizard, lang, cityLabel, money) : [];
      return {
        mode: "basic",
        provider: "basic",
        recommendation: null,
        reply: picked ? "" : items.length ? t("fallback.ack", { items: items.join(lang === "ar" ? "، " : ", ") }) : t("fallback.ackNothing"),
        suggestions: [],
        need,
      };
    }
  }

  const services = resolveServices(need);
  if (!services.length) {
    return { mode: "basic", provider: "basic", recommendation: null, reply: t("fallback.intro", { country: countryLabel }), suggestions: examples(country, lang), need: wizard ? need : undefined };
  }

  const industry = need.industry === "other" ? null : need.industry;
  const matches = await findMatches({ services, city: need.city, budgetMaxJod: need.budgetMax, platforms: need.platforms, industry, country }, 5);
  const prices = await marketPrices(services[0], null);
  const range = prices.suggested;
  // The client's own budget wins; otherwise the market range (never below their minimum).
  const budgetMax = need.budgetMax ?? (range ? Math.max(range.max, need.budgetMin ?? 0) : null);
  const budgetMin = need.budgetMax ? Math.min(need.budgetMin ?? need.budgetMax, range?.min ?? need.budgetMax) : (need.budgetMin ?? range?.min ?? null);
  const serviceNames = services.map((s) => serviceLabel(s, lang)).join(lang === "ar" ? "، " : ", ");
  const note = range
    ? t("fallback.note", { count: prices.agencies, country: countryLabel, min: money(range.min), max: money(range.max), median: money(range.median) })
    : t("fallback.noPrices", { country: countryLabel });

  if (!matches.length) {
    // Nothing fits everything: say so, then the closest agencies with what differs (docs/35).
    const closest = await closestAsMatches(
      { services, city: need.city, country, platforms: need.platforms, budgetMin: need.budgetMin, budgetMax: need.budgetMax, industry },
      { includeDemo: scopedIncludeDemo() },
    );
    if (closest.length) {
      return {
        mode: "basic",
        provider: "basic",
        reply: t("closestReply", { country: countryLabel }),
        recommendation: {
          agencies: closest,
          services,
          city: need.city,
          platforms: need.platforms,
          budgetMinJod: budgetMin,
          budgetMaxJod: budgetMax,
          budgetNote: note,
          summary: last.slice(0, 1500),
          currency: c.currency,
          closest: true,
        },
        suggestions: wizard ? [] : [t("fallback.chipAnyCity"), t("fallback.chipHigherBudget")],
        need: wizard ? need : undefined,
      };
    }
    return {
      mode: "basic",
      provider: "basic",
      recommendation: null,
      reply: t("fallback.notFound", { country: countryLabel, services: serviceNames }),
      suggestions: wizard ? [] : [t("fallback.chipAnyCity"), t("fallback.chipHigherBudget")],
      need: wizard ? need : undefined,
    };
  }

  const summary = [
    t("fallback.summaryServices", { services: serviceNames }),
    need.city ? t("fallback.summaryCity", { city: cityLabel(need.city) ?? need.city }) : "",
    need.budgetMax ? t("fallback.summaryBudget", { budget: money(need.budgetMax) }) : "",
  ]
    .filter(Boolean)
    .join(lang === "ar" ? "، " : ", ");

  return {
    mode: "basic",
    provider: "basic",
    reply: t("fallback.found", { count: matches.length, country: countryLabel, services: serviceNames }),
    recommendation: {
      agencies: matches,
      services,
      city: need.city,
      platforms: need.platforms,
      budgetMinJod: budgetMin,
      budgetMaxJod: budgetMax,
      budgetNote: note,
      summary: `${summary}. ${picked ? "" : last}`.trim().slice(0, 1500),
      currency: c.currency,
    },
    suggestions: wizard ? [] : [t("fallback.chipSend"), t("fallback.chipPhoto"), t("fallback.chipOtherCity")],
    need: wizard ? need : undefined,
  };
}

/** What a typed message added to the wizard's answers, as short labels. */
function acknowledged(need: WizardNeed, before: WizardNeed, lang: "ar" | "en", cityLabel: (k: string | null) => string | null, money: (n: number) => string) {
  const t = createTranslator({ locale: lang, messages: lang === "ar" ? ar : en });
  const items: string[] = [];
  for (const s of need.services) if (!before.services.includes(s)) items.push(serviceLabel(s, lang));
  if (need.industry && need.industry !== before.industry) items.push(t(`Industries.${need.industry}` as "Industries.other"));
  for (const p of need.platforms) if (!before.platforms.includes(p)) items.push(t(`Platforms.${p}` as "Platforms.instagram"));
  if (need.budgetMax !== null && need.budgetMax !== before.budgetMax) items.push(money(need.budgetMax));
  if (need.city && need.city !== before.city) items.push(cityLabel(need.city) ?? need.city);
  return items;
}
