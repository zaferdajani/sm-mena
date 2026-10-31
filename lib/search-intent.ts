import { BUSINESS_WORDS } from "@/lib/industry-words";
import { searchTags } from "@/lib/services/catalog";
import { normalizeForSearch } from "@/lib/text";

/**
 * What a typed search means besides its exact words: the services whose names or aliases it names (so
 * "سوشال" finds social media agencies) and the business types it names (so "مخبز" or "bakery" finds work
 * for restaurants and cafés; one word list, lib/industry-words.ts). Pure; the lists widen a search, they never narrow it.
 */

const INDEX = Object.entries(BUSINESS_WORDS).map(([key, words]) => ({ key, words: words.map((w) => normalizeForSearch(w)) }));

export function searchIntent(query: string): { services: string[]; industries: string[] } {
  const q = normalizeForSearch(query).trim();
  if (q.length < 2) return { services: [], industries: [] };
  const words = q.split(/\s+/);
  const industries = INDEX.filter(({ words: list }) => list.some((w) => w === q || words.includes(w) || (w.includes(" ") && q.includes(w)))).map((i) => i.key);
  const services = q.length >= 3 ? searchTags(q, { limit: 6 }).map((t) => t.key) : [];
  return { services, industries };
}
