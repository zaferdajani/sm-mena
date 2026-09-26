// No "server-only": the seed script loads it too (through lib/data/agencies → plans).
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

// Platform feature switches (Admin → Features; docs/34-feature-switches.md),
// the OneClickConvert console model. Each feature is:
//   on    — everyone can use it;
//   soon  — shown as "Coming soon" (under construction); only pilot agencies
//           (listed by handle) can use it, and staff can preview its pages;
//   off   — hidden everywhere; existing records keep working (a contract
//           already signed is never cut off).
// Stored in app_settings ("features"); read through a short in-memory cache.

export const FEATURE_STATES = ["on", "soon", "off"] as const;
export type FeatureState = (typeof FEATURE_STATES)[number];

export const FEATURES = [
  { key: "protected_payments", group: "money" },
  { key: "paid_plans", group: "money" },
  { key: "contracts", group: "work" },
  { key: "ndas", group: "work" },
  { key: "quote_requests", group: "work" },
  { key: "ai_matchmaker", group: "discovery" },
  { key: "messaging", group: "discovery" },
  { key: "reviews", group: "trust" },
  { key: "partners", group: "network" },
  { key: "demo_view", group: "discovery" },
] as const;
export type FeatureKey = (typeof FEATURES)[number]["key"];
export const isFeatureKey = (k: string): k is FeatureKey => FEATURES.some((f) => f.key === k);

export type FeatureSetting = { state: FeatureState; pilots: string[] };
export type FeatureMap = Record<FeatureKey, FeatureSetting>;

/** Defaults before an admin changes anything: protected payments wait for the licensed partner. */
export function defaultFeatures(): FeatureMap {
  const out = {} as FeatureMap;
  for (const f of FEATURES) out[f.key] = { state: "on", pilots: [] };
  out.protected_payments = { state: "soon", pilots: [] };
  out.paid_plans = { state: process.env.MONETIZATION_ENABLED === "true" ? "on" : "soon", pilots: [] };
  // FEATURE_DEFAULTS="protected_payments=on,ndas=off" changes the starting point (the e2e server uses it).
  for (const pair of (process.env.FEATURE_DEFAULTS ?? "").split(",")) {
    const [k, v] = pair.split("=").map((x) => x?.trim());
    if (k && isFeatureKey(k) && (FEATURE_STATES as readonly string[]).includes(v ?? "")) out[k] = { state: v as FeatureState, pilots: [] };
  }
  return out;
}

const KEY = "features";
const TTL = 15_000;
let cache: { at: number; value: FeatureMap } | null = null;

function merge(stored: unknown): FeatureMap {
  const out = defaultFeatures();
  if (!stored || typeof stored !== "object") return out;
  for (const [k, v] of Object.entries(stored as Record<string, unknown>)) {
    if (!isFeatureKey(k) || !v || typeof v !== "object") continue;
    const s = v as Partial<FeatureSetting>;
    if (s.state && (FEATURE_STATES as readonly string[]).includes(s.state)) out[k].state = s.state;
    if (Array.isArray(s.pilots)) out[k].pilots = s.pilots.filter((p): p is string => typeof p === "string").slice(0, 50);
  }
  return out;
}

/** Every feature's current setting (cached for a few seconds per server instance). */
export async function getFeatures(): Promise<FeatureMap> {
  if (cache && Date.now() - cache.at < TTL) return cache.value;
  try {
    const db = await getDb();
    const [row] = await db.select().from(appSettings).where(eq(appSettings.key, KEY));
    cache = { at: Date.now(), value: merge(row?.value) };
  } catch {
    // Database unreachable: keep the last known switches, else the defaults.
    cache = { at: Date.now(), value: cache?.value ?? defaultFeatures() };
  }
  return cache.value;
}

/** Last loaded state, for synchronous code (the layout loads switches on every request). */
export function cachedFeatureState(key: FeatureKey): FeatureState {
  return (cache?.value ?? defaultFeatures())[key].state;
}

export async function featureState(key: FeatureKey): Promise<FeatureState> {
  return (await getFeatures())[key].state;
}

/**
 * Whether someone may use a feature: on for everyone; in "soon" only pilot
 * agencies (by handle) and staff previewing it; "off" for no one.
 */
export async function featureOpen(key: FeatureKey, who: { agencyHandle?: string | null; staff?: boolean } = {}): Promise<boolean> {
  const f = (await getFeatures())[key];
  if (f.state === "on") return true;
  if (f.state === "off") return false;
  return Boolean(who.staff || (who.agencyHandle && f.pilots.includes(who.agencyHandle)));
}

/** Admin: changes one feature. Pilot handles are lower-cased and de-duplicated. */
export async function setFeature(key: FeatureKey, setting: FeatureSetting, by: string | null) {
  const current = await getFeatures();
  const pilots = [...new Set(setting.pilots.map((p) => p.trim().toLowerCase().replace(/^@/, "")).filter((p) => /^[a-z0-9._]{2,40}$/.test(p)))].slice(0, 50);
  const next: FeatureMap = { ...current, [key]: { state: setting.state, pilots } };
  const db = await getDb();
  await db
    .insert(appSettings)
    .values({ key: KEY, value: next, updatedBy: by })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: next, updatedAt: new Date(), updatedBy: by } });
  cache = { at: Date.now(), value: next };
  return next[key];
}

/** Tests only: forget the cached switches. */
export function resetFeatureCache() {
  cache = null;
}
