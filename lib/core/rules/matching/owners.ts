// Owner ↔ provider matching (docs/59-owner-matching.md). Pure: given what a business owner needs and the
// providers that could serve them, rank the providers. Same country is required (a provider that lists the
// owner's country among the countries it serves counts); the same city, every needed service group the
// provider covers, the owner's business type among the provider's industries and a fuller page each add to
// the score. Reasons are keys the pages translate.
import { SERVICE_GROUPS } from "@/lib/core/catalog/services/catalog";
import catalog from "@/data/service-catalog.json";

export type OwnerNeedFacts = { country: string; city: string; businessType: string | null; services: string[] };
export type ProviderFacts = {
  id: string;
  country: string;
  city: string;
  servesCountries: string[];
  services: string[];
  industries: string[];
  isDemo: boolean;
  active: boolean;
  postCount: number;
  hasBio: boolean;
};
export type OwnerMatchReason = "same_city" | "serves_country" | "services_all" | "services_some" | "industry" | "has_work";
export type OwnerMatch = { agencyId: string; score: number; reasons: OwnerMatchReason[] };

const groupOf = new Map<string, string>((catalog as { services: { key: string; group: string }[] }).services.map((s) => [s.key, s.group]));
export const KNOWN_GROUPS: readonly string[] = SERVICE_GROUPS.map((g) => g.key);

/** The service groups a provider's service keys belong to (unknown keys are ignored). */
export function providerGroups(services: string[]): Set<string> {
  const out = new Set<string>();
  for (const k of services) {
    const g = groupOf.get(k) ?? (KNOWN_GROUPS.includes(k) ? k : null);
    if (g) out.add(g);
  }
  return out;
}

export const OWNER_MATCH_WEIGHTS = { country: 30, sameCity: 25, servesCountry: 10, servicesAll: 30, servicesSome: 15, industry: 10, hasWork: 10, bio: 5 } as const;
export const OWNER_MATCH_LIMIT = 5;

export function scoreProvider(need: OwnerNeedFacts, p: ProviderFacts): OwnerMatch | null {
  if (p.isDemo || !p.active) return null;
  const inCountry = p.country === need.country;
  const serves = !inCountry && p.servesCountries.includes(need.country);
  if (!inCountry && !serves) return null;
  const reasons: OwnerMatchReason[] = [];
  let score = OWNER_MATCH_WEIGHTS.country;
  if (inCountry && p.city === need.city) { score += OWNER_MATCH_WEIGHTS.sameCity; reasons.push("same_city"); }
  if (serves) { score += OWNER_MATCH_WEIGHTS.servesCountry; reasons.push("serves_country"); }
  const groups = providerGroups(p.services);
  const wanted = need.services.filter((g) => KNOWN_GROUPS.includes(g));
  const covered = wanted.filter((g) => groups.has(g));
  if (wanted.length && covered.length === wanted.length) { score += OWNER_MATCH_WEIGHTS.servicesAll; reasons.push("services_all"); }
  else if (covered.length) { score += Math.round((OWNER_MATCH_WEIGHTS.servicesSome * covered.length) / wanted.length); reasons.push("services_some"); }
  else if (wanted.length) return null; // a provider that covers none of what the owner needs is not a match
  if (need.businessType && p.industries.includes(need.businessType)) { score += OWNER_MATCH_WEIGHTS.industry; reasons.push("industry"); }
  if (p.postCount > 0) { score += OWNER_MATCH_WEIGHTS.hasWork; reasons.push("has_work"); }
  if (p.hasBio) score += OWNER_MATCH_WEIGHTS.bio;
  return { agencyId: p.id, score, reasons };
}

/** The best providers for one owner, strongest first; ties break on id so a rerun gives the same list. */
export function matchOwner(need: OwnerNeedFacts, providers: ProviderFacts[], limit = OWNER_MATCH_LIMIT): OwnerMatch[] {
  return providers
    .map((p) => scoreProvider(need, p))
    .filter((m): m is OwnerMatch => m !== null)
    .sort((a, b) => b.score - a.score || a.agencyId.localeCompare(b.agencyId))
    .slice(0, limit);
}
