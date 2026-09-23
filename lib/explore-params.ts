import { CITIES, INDUSTRIES, PLATFORMS, PRICE_STEPS } from "@/lib/labels";
import { isServiceKey } from "@/lib/taxonomy";
import type { FeedFilters } from "@/lib/data/posts";

export type ExploreParams = FeedFilters & { tab: "posts" | "agencies" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

/** Parses explore search params, silently dropping anything not in the taxonomy. */
export function parseExploreParams(sp: Record<string, string | string[] | undefined>): ExploreParams {
  const service = one(sp.service);
  const city = one(sp.city);
  const platform = one(sp.platform);
  const industry = one(sp.industry);
  const price = Number(one(sp.max));
  return {
    tab: one(sp.tab) === "agencies" ? "agencies" : "posts",
    q: one(sp.q)?.slice(0, 80),
    service: service && isServiceKey(service) ? service : undefined,
    city: city && (CITIES as readonly string[]).includes(city) ? city : undefined,
    platform: platform && (PLATFORMS as readonly string[]).includes(platform) ? platform : undefined,
    industry: industry && (INDUSTRIES as readonly string[]).includes(industry) ? industry : undefined,
    maxPrice: (PRICE_STEPS as readonly number[]).includes(price) ? price : undefined,
    verified: one(sp.verified) === "1" || undefined,
  };
}

export function hasActiveFilters(p: ExploreParams) {
  return Boolean(p.q || p.service || p.city || p.platform || p.industry || p.maxPrice || p.verified);
}
