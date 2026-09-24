import { CITIES, INDUSTRIES, PLATFORMS } from "@/lib/labels";
import { isServiceKey } from "@/lib/taxonomy";
import type { FeedFilters } from "@/lib/data/posts";

export type ExploreParams = FeedFilters & { tab: "posts" | "agencies" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

/** A JOD amount from the URL, or undefined when missing or out of range. */
const amount = (v: string | undefined) => {
  const n = Number(v);
  return v && Number.isInteger(n) && n >= 0 && n <= 1_000_000 ? n : undefined;
};

/**
 * Parses explore search params, silently dropping anything not in the
 * taxonomy. Platforms are a comma-separated list (?platforms=instagram,tiktok;
 * the older single ?platform= still works). Budget is a monthly range
 * (?min=300&max=600, in JOD).
 */
export function parseExploreParams(sp: Record<string, string | string[] | undefined>): ExploreParams {
  const service = one(sp.service);
  const city = one(sp.city);
  const industry = one(sp.industry);
  const platforms = [...new Set([...(one(sp.platforms)?.split(",") ?? []), ...(one(sp.platform) ? [one(sp.platform)!] : [])])]
    .map((p) => p.trim())
    .filter((p) => (PLATFORMS as readonly string[]).includes(p));
  let minPrice = amount(one(sp.min));
  let maxPrice = amount(one(sp.max));
  if (maxPrice === 0) maxPrice = undefined;
  if (minPrice === 0) minPrice = undefined;
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];
  return {
    tab: one(sp.tab) === "agencies" ? "agencies" : "posts",
    q: one(sp.q)?.slice(0, 80),
    service: service && isServiceKey(service) ? service : undefined,
    city: city && (CITIES as readonly string[]).includes(city) ? city : undefined,
    platforms: platforms.length ? platforms : undefined,
    industry: industry && (INDUSTRIES as readonly string[]).includes(industry) ? industry : undefined,
    minPrice,
    maxPrice,
    fullService: one(sp.full) === "1" || undefined,
    verified: one(sp.verified) === "1" || undefined,
  };
}

export function hasActiveFilters(p: ExploreParams) {
  return Boolean(p.q || p.service || p.city || p.platforms?.length || p.industry || p.minPrice || p.maxPrice || p.fullService || p.verified);
}
