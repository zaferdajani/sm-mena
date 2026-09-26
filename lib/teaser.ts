import { COUNTRY_CODES, countryOfCity, type CountryCode } from "@/lib/countries";

/**
 * The pre-launch teaser's live numbers (docs/39-teaser.md): registered
 * providers per country and city. Real, active providers only; demo
 * agencies never count (docs/31). Pure, so it is unit-tested.
 */
export type ProviderRow = { country: string; city: string; kind: "agency" | "freelancer" };
export type TeaserStats = {
  total: number;
  agencies: number;
  freelancers: number;
  /** Every served country, most providers first (ties keep the COUNTRY_CODES order). */
  countries: { code: CountryCode; n: number }[];
  /** Cities with at least one provider, most first. */
  cities: { key: string; country: CountryCode; n: number }[];
};

/** Below this many providers the page says "be among the first" instead of quoting the total. */
export const TEASER_MIN_PROOF = 25;

export function summariseProviders(rows: ProviderRow[]): TeaserStats {
  const byCountry = new Map<CountryCode, number>(COUNTRY_CODES.map((c) => [c, 0]));
  const byCity = new Map<string, number>();
  let freelancers = 0;
  for (const r of rows) {
    // The city decides the country when they disagree (city keys are unique across countries).
    const code = countryOfCity(r.city) ?? (COUNTRY_CODES as readonly string[]).find((c) => c === r.country);
    if (!code) continue;
    byCountry.set(code as CountryCode, (byCountry.get(code as CountryCode) ?? 0) + 1);
    if (countryOfCity(r.city)) byCity.set(r.city, (byCity.get(r.city) ?? 0) + 1);
    if (r.kind === "freelancer") freelancers++;
  }
  const countries = COUNTRY_CODES.map((code, i) => ({ code, n: byCountry.get(code) ?? 0, i }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map(({ code, n }) => ({ code, n }));
  const cities = [...byCity]
    .map(([key, n]) => ({ key, country: countryOfCity(key)!, n }))
    .sort((a, b) => b.n - a.n || a.key.localeCompare(b.key));
  const total = countries.reduce((s, c) => s + c.n, 0);
  return { total, agencies: total - freelancers, freelancers, countries, cities };
}

/** A seat number as shown on the page and the share card: "#0042" (at least four digits). */
export const seatLabel = (seat: number) => `#${String(seat).padStart(4, "0")}`;

/**
 * The vault: teasers about what's coming that unlock as real seats fill
 * (docs/39). Everyone works toward the next one together (goal gradient).
 */
export const VAULT_MILESTONES = [
  { key: "one", at: 100 },
  { key: "two", at: 500 },
  { key: "three", at: 1000 },
] as const;

export function vaultState(seats: number) {
  const items = VAULT_MILESTONES.map((m) => ({ ...m, open: seats >= m.at }));
  const next = items.find((m) => !m.open) ?? null;
  const prev = [...items].reverse().find((m) => m.open)?.at ?? 0;
  const progress = next ? Math.min(1, Math.max(0, (seats - prev) / (next.at - prev))) : 1;
  return { items, next, progress, left: next ? next.at - seats : 0 };
}
