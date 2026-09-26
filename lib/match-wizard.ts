import { currencyLabel, type CountryCode } from "@/lib/countries";
import { PLATFORMS } from "@/lib/labels";
import { taxonomy } from "@/lib/taxonomy";

// The guided matchmaker ("wizard"): one question at a time with tappable
// choices. Pure and shared by the chat page (client) and /api/match (server),
// so both agree on which question comes next. See docs/12-ai-matchmaker.md.

export const STEPS = ["groups", "services", "industry", "platforms", "budget", "city"] as const;
export type Step = (typeof STEPS)[number];

export type WizardNeed = {
  /** Service groups (taxonomy categories) the client picked. */
  groups: string[];
  /** Specific services; empty means "any of the chosen groups". */
  services: string[];
  industry: string | null;
  platforms: string[];
  /** Monthly budget in the visitor's currency. */
  budgetMin: number | null;
  budgetMax: number | null;
  /** A city in the visitor's country; null with "city" answered means the whole country. */
  city: string | null;
  /** Steps the client answered, including "Not sure" and "Any". */
  answered: Step[];
};

export const emptyNeed = (): WizardNeed => ({ groups: [], services: [], industry: null, platforms: [], budgetMin: null, budgetMax: null, city: null, answered: [] });

export const GROUPS = taxonomy.categories.map((c) => c.key) as string[];
const groupServices = new Map<string, string[]>(taxonomy.categories.map((c) => [c.key, c.services.map((s) => s.key)]));
export const servicesOfGroup = (group: string) => groupServices.get(group) ?? [];
export const groupOfService = (service: string): string | null => taxonomy.categories.find((c) => c.services.some((s) => s.key === service))?.key ?? null;

/** "Any of these" in a group means its most-asked-for services. */
const FLAGSHIPS: Record<string, string[]> = {
  social_media: ["smm_management", "smm_content"],
  paid_media: ["ads_meta", "ads_google"],
  creative: ["video_production", "photography"],
  branding: ["brand_identity", "graphic_design"],
  digital: ["web_design", "app_development", "seo"],
  offline: ["event_coverage", "print_design"],
};
const ADS_BY_PLATFORM: Record<string, string> = { instagram: "ads_meta", facebook: "ads_meta", tiktok: "ads_tiktok", snapchat: "ads_snapchat", google: "ads_google", linkedin: "ads_linkedin" };

/** The service keys to search for (at most 6). */
export function resolveServices(need: WizardNeed): string[] {
  if (need.services.length) return [...new Set(need.services)].slice(0, 6);
  const out: string[] = [];
  for (const g of need.groups) {
    // Paid ads on the platforms they chose beat a generic guess.
    const ads = g === "paid_media" ? need.platforms.map((p) => ADS_BY_PLATFORM[p]).filter(Boolean) : [];
    out.push(...(ads.length ? ads : (FLAGSHIPS[g] ?? servicesOfGroup(g).slice(0, 2))));
  }
  return [...new Set(out)].slice(0, 6);
}

/** Platforms matter unless the client only wants branding or on-ground work. */
export function platformsRelevant(need: WizardNeed) {
  const groups = need.groups.length ? need.groups : need.services.map(groupOfService).filter((g): g is string => g !== null);
  return !groups.length || groups.some((g) => g !== "branding" && g !== "offline");
}

const has = (need: WizardNeed, step: Step) => need.answered.includes(step);

/** The next question to ask, or "results" when there is enough to search. */
export function nextStep(need: WizardNeed): Step | "results" {
  if (!has(need, "groups") && !need.groups.length && !need.services.length) return "groups";
  if (!has(need, "services") && !need.services.length && need.groups.length) return "services";
  if (!has(need, "industry") && !need.industry) return "industry";
  if (!has(need, "platforms") && !need.platforms.length && platformsRelevant(need)) return "platforms";
  if (!has(need, "budget") && need.budgetMax === null && need.budgetMin === null) return "budget";
  if (!has(need, "city") && !need.city) return "city";
  return "results";
}

const mark = (need: WizardNeed, step: Step): Step[] => (need.answered.includes(step) ? need.answered : [...need.answered, step]);

export type Answer =
  | { step: "groups"; groups: string[] }
  | { step: "services"; services: string[] }
  | { step: "industry"; industry: string | null }
  | { step: "platforms"; platforms: string[] }
  | { step: "budget"; min: number | null; max: number | null }
  | { step: "city"; city: string | null };

/** Applies one answer (an empty list or null means "Any" / "Not sure"). */
export function answer(need: WizardNeed, a: Answer): WizardNeed {
  const answered = mark(need, a.step);
  switch (a.step) {
    case "groups":
      return { ...need, groups: [...new Set(a.groups)], services: need.services.filter((s) => a.groups.includes(groupOfService(s) ?? "")), answered };
    case "services":
      return { ...need, services: [...new Set(a.services)], answered };
    case "industry":
      return { ...need, industry: a.industry, answered };
    case "platforms":
      return { ...need, platforms: [...new Set(a.platforms)], answered };
    case "budget":
      return { ...need, budgetMin: a.min, budgetMax: a.max, answered };
    case "city":
      return { ...need, city: a.city, answered };
  }
}

/** Asks a question again ("Change budget", "Change city"). */
export function reopen(need: WizardNeed, step: Step): WizardNeed {
  const answered = need.answered.filter((s) => s !== step);
  if (step === "budget") return { ...need, budgetMin: null, budgetMax: null, answered };
  if (step === "city") return { ...need, city: null, answered };
  if (step === "industry") return { ...need, industry: null, answered };
  if (step === "platforms") return { ...need, platforms: [], answered };
  return { ...need, answered };
}

/** "Show matches now": the remaining questions count as "Not sure". */
export const skipRest = (need: WizardNeed): WizardNeed => ({ ...need, answered: [...STEPS] });

/** What a free-text message added. Stated values replace earlier answers. */
export function mergeText(
  need: WizardNeed,
  text: { services: string[]; platforms: string[]; industry: string | null; city: string | null; budget: number | null },
): WizardNeed {
  let next = { ...need };
  if (text.services.length) {
    const services = [...new Set([...need.services, ...text.services])].slice(0, 6);
    const groups = [...new Set([...need.groups, ...text.services.map(groupOfService).filter((g): g is string => g !== null)])];
    next = { ...next, services, groups, answered: [...new Set<Step>([...next.answered, "groups", "services"])] };
  }
  if (text.platforms.length) next = { ...next, platforms: [...new Set([...need.platforms, ...text.platforms])], answered: mark(next, "platforms") };
  if (text.industry) next = { ...next, industry: text.industry, answered: mark(next, "industry") };
  if (text.city) next = { ...next, city: text.city, answered: mark(next, "city") };
  if (text.budget) next = { ...next, budgetMin: null, budgetMax: text.budget, answered: mark(next, "budget") };
  return next;
}

// ── Budget choices ──────────────────────────────────────────────────────────

/**
 * Where the budget ranges split, per currency, when there are too few real
 * prices: roughly what a small business pays an agency a month there.
 */
export const DEFAULT_BUDGET_EDGES: Record<string, number[]> = {
  JOD: [300, 600, 1200, 2500],
  SAR: [2000, 5000, 10000, 20000],
  AED: [2000, 5000, 10000, 20000],
  QAR: [2000, 5000, 10000, 20000],
  KWD: [150, 400, 800, 1600],
  BHD: [200, 500, 1000, 2000],
  OMR: [200, 500, 1000, 2000],
  EGP: [10000, 25000, 50000, 100000],
};

/** Rounds to a friendly figure: 2,345 → 2,500; 180 → 200; 12,700 → 15,000. */
export function niceRound(n: number): number {
  if (n <= 0) return 0;
  const mag = 10 ** Math.floor(Math.log10(n));
  const step = mag / 2;
  return Math.max(step, Math.round(n / step) * step);
}

export type PriceStats = { min: number; max: number; median: number } | null;

/** Split points from real prices (quartiles, from suggestBudget), else the currency's defaults. */
export function budgetEdges(currency: string, stats: PriceStats): number[] {
  const fallback = DEFAULT_BUDGET_EDGES[currency] ?? DEFAULT_BUDGET_EDGES.JOD;
  if (!stats) return fallback;
  // Each range at least 25% wider than the one before, so no choice is a sliver.
  const edges: number[] = [];
  for (const e of [stats.min, stats.median, stats.max, stats.max * 2].map(niceRound).sort((a, b) => a - b)) {
    if (e > 0 && (!edges.length || e >= edges.at(-1)! * 1.25)) edges.push(e);
  }
  return edges.length >= 3 ? edges : fallback;
}

export type BudgetRange = { min: number | null; max: number | null };

/** 4–5 monthly ranges: under the first split, between splits, over the last. */
export function budgetRanges(currency: string, stats: PriceStats = null): BudgetRange[] {
  const e = budgetEdges(currency, stats);
  return [{ min: null, max: e[0] }, ...e.slice(1).map((max, i) => ({ min: e[i], max })), { min: e.at(-1)!, max: null }];
}

/** A typical small monthly budget for examples ("… 2,000 SAR budget"). */
export const exampleBudget = (currency: string) => (DEFAULT_BUDGET_EDGES[currency] ?? DEFAULT_BUDGET_EDGES.JOD)[0];

/** "5,000 ر.س" in Arabic, "5,000 SAR" in English (Latin digits in both). */
export function formatAmount(n: number, locale: string, currency: string) {
  return `${n.toLocaleString(locale === "ar" ? "ar-u-nu-latn" : "en")} ${currencyLabel(currency, locale)}`;
}

// ── Other choices ───────────────────────────────────────────────────────────

export const PLATFORM_CHOICES = PLATFORMS as readonly string[];

/** How many cities the "Where?" question shows before "More cities". */
export const MAIN_CITIES = 8;

/** Dictation language for the browser's speech recognition. */
export function speechLang(locale: string, country: CountryCode) {
  if (locale !== "ar") return "en-US";
  const map: Record<CountryCode, string> = { jo: "ar-JO", sa: "ar-SA", ae: "ar-AE", kw: "ar-KW", qa: "ar-QA", bh: "ar-BH", om: "ar-OM", eg: "ar-EG" };
  return map[country];
}

/**
 * After the visitor changes country: a budget in the old currency and a city
 * there no longer apply, so those questions come back (or `city` answers it).
 */
export function forNewCountry(need: WizardNeed, city: string | null = null): WizardNeed {
  let next = need.budgetMin !== null || need.budgetMax !== null ? reopen(need, "budget") : need;
  next = reopen(next, "city");
  return city ? answer(next, { step: "city", city }) : next;
}
