// How close an agency comes to what someone asked for, when nothing matches
// every requirement (docs/35-closest-matches.md). Pure, unit-tested.
//
// Only requirements the person actually set count. Each gets a weight and a
// score from 0 to 1 (met = 1, partly = between, missing = 0); the match
// percentage is the weighted average. Every requirement also comes back as a
// difference the page can show: what was asked, what the agency has.

import { FULL_SERVICE_GROUPS } from "@/lib/full-service";
import { tagInfo } from "@/lib/services/catalog";
import { allServices } from "@/lib/taxonomy";

export type Requirements = {
  services?: string[];
  city?: string | null;
  /** The visitor's country (always set: results are for one market). */
  country: string;
  platforms?: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  industry?: string | null;
  fullService?: boolean;
  verified?: boolean;
};

export type CloseAgency = {
  services: string[];
  platforms: string[];
  industries: string[];
  city: string;
  country: string;
  servesCountries: string[];
  /** The lowest price the agency shows: starting price or cheapest package. */
  priceJod: number | null;
  /** Its most expensive package, when it has packages (for a minimum budget). */
  maxPackageJod: number | null;
  isVerified: boolean;
};

export type DiffStatus = "met" | "partly" | "missing";

export type Difference =
  | { key: "services"; status: DiffStatus; offered: string[]; missing: string[]; related: string[] }
  | { key: "location"; status: DiffStatus; wantedCity: string | null; city: string; country: string; wantedCountry: string; serves: boolean }
  | { key: "budget"; status: DiffStatus | "unknown"; min: number | null; max: number | null; price: number | null; over: number }
  | { key: "platforms"; status: DiffStatus; offered: string[]; missing: string[] }
  | { key: "industry"; status: DiffStatus; industry: string }
  | { key: "fullService"; status: DiffStatus; groups: number }
  | { key: "verified"; status: DiffStatus };

export type Closeness = { percent: number; differences: Difference[] };

export const CLOSENESS_WEIGHTS = { services: 40, budget: 20, location: 15, platforms: 10, industry: 8, fullService: 7, verified: 5 } as const;

/** Budget: up to this much over the maximum counts as "partly" (and scores on a slope). */
const BUDGET_STRETCH = 0.5;

const categoryOf = (key: string) => allServices.find((s) => s.key === key)?.category ?? null;
/** A service's core key (catalog tags roll up to one of the taxonomy's services). */
const coreOf = (key: string) => tagInfo(key)?.parent ?? key;

export function closeness(req: Requirements, a: CloseAgency): Closeness {
  const parts: { weight: number; score: number }[] = [];
  const differences: Difference[] = [];

  // Services: each one asked for is offered (1), or something in the same category is (0.5).
  const wanted = [...new Set(req.services ?? [])];
  if (wanted.length) {
    const offered: string[] = [];
    const missing: string[] = [];
    const related = new Set<string>();
    let score = 0;
    for (const s of wanted) {
      if (a.services.includes(s) || a.services.includes(coreOf(s))) {
        offered.push(s);
        score += 1;
        continue;
      }
      missing.push(s);
      const cat = categoryOf(coreOf(s));
      const near = cat ? a.services.filter((x) => categoryOf(coreOf(x)) === cat && !wanted.includes(x)) : [];
      if (near.length) {
        score += 0.5;
        near.slice(0, 2).forEach((x) => related.add(x));
      }
    }
    score /= wanted.length;
    parts.push({ weight: CLOSENESS_WEIGHTS.services, score });
    differences.push({ key: "services", status: missing.length === 0 ? "met" : offered.length || related.size ? "partly" : "missing", offered, missing, related: [...related] });
  }

  // Location: the city asked for (1), another city in the country (0.6), based elsewhere but serving it (0.5).
  {
    const inCountry = a.country === req.country;
    const serves = a.servesCountries.includes(req.country);
    let score: number;
    if (req.city) score = a.city === req.city ? 1 : inCountry ? 0.6 : serves ? 0.5 : 0;
    else score = inCountry ? 1 : serves ? 0.8 : 0;
    // Where the agency is only matters as a requirement when a city was asked for or it's outside the country.
    if (req.city || !inCountry) {
      parts.push({ weight: CLOSENESS_WEIGHTS.location, score });
      differences.push({ key: "location", status: score === 1 ? "met" : score > 0 ? "partly" : "missing", wantedCity: req.city ?? null, city: a.city, country: a.country, wantedCountry: req.country, serves });
    }
  }

  // Budget: the agency's lowest price within the maximum (1), up to 50% over (sliding), or no price shown (0.5).
  const max = req.budgetMax ?? null;
  const min = req.budgetMin ?? null;
  if (max || min) {
    let score = 1;
    let status: DiffStatus | "unknown" = "met";
    let over = 0;
    if (a.priceJod === null) {
      score = 0.5;
      status = "unknown";
    } else if (max && a.priceJod > max) {
      over = a.priceJod - max;
      const ratio = over / max;
      score = ratio >= BUDGET_STRETCH ? 0 : 1 - ratio / BUDGET_STRETCH;
      status = score > 0 ? "partly" : "missing";
    } else if (min && a.maxPackageJod !== null && a.maxPackageJod < min) {
      score = 0.7; // cheaper than the budget: usually fine, but maybe a smaller scope
      status = "partly";
    }
    parts.push({ weight: CLOSENESS_WEIGHTS.budget, score });
    differences.push({ key: "budget", status, min, max, price: a.priceJod, over });
  }

  const platforms = [...new Set(req.platforms ?? [])];
  if (platforms.length) {
    const offered = platforms.filter((p) => a.platforms.includes(p));
    const missing = platforms.filter((p) => !a.platforms.includes(p));
    parts.push({ weight: CLOSENESS_WEIGHTS.platforms, score: offered.length / platforms.length });
    differences.push({ key: "platforms", status: !missing.length ? "met" : offered.length ? "partly" : "missing", offered, missing });
  }

  if (req.industry) {
    const has = a.industries.includes(req.industry);
    parts.push({ weight: CLOSENESS_WEIGHTS.industry, score: has ? 1 : 0 });
    differences.push({ key: "industry", status: has ? "met" : "missing", industry: req.industry });
  }

  if (req.fullService) {
    const groups = FULL_SERVICE_GROUPS.filter((g) => g.some((s) => a.services.includes(s))).length;
    const score = groups / FULL_SERVICE_GROUPS.length;
    parts.push({ weight: CLOSENESS_WEIGHTS.fullService, score });
    differences.push({ key: "fullService", status: score === 1 ? "met" : score > 0 ? "partly" : "missing", groups });
  }

  if (req.verified) {
    parts.push({ weight: CLOSENESS_WEIGHTS.verified, score: a.isVerified ? 1 : 0 });
    differences.push({ key: "verified", status: a.isVerified ? "met" : "missing" });
  }

  const total = parts.reduce((s, p) => s + p.weight, 0);
  const percent = total ? Math.round((parts.reduce((s, p) => s + p.weight * p.score, 0) / total) * 100) : 0;
  return { percent, differences };
}

/** Whether a search asked for anything closeness can compare (free text alone can't be). */
export const hasRequirements = (r: Requirements) =>
  Boolean(r.services?.length || r.city || r.platforms?.length || r.budgetMax || r.budgetMin || r.industry || r.fullService || r.verified);
