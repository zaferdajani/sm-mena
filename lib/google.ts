// Google Business Profile rating via the Places API (New).
// Needs GOOGLE_PLACES_API_KEY. Without it the link is stored and shown, but no
// rating is fetched. Google's policies require showing the rating with Google
// attribution and refreshing rather than storing it indefinitely; we refresh
// on save and daily via /api/cron/google.
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies } from "@/lib/db/schema";

const FIELDS = "id,displayName,rating,userRatingCount,googleMapsUri";

type Place = { id: string; displayName?: { text: string }; rating?: number; userRatingCount?: number; googleMapsUri?: string };

export type GoogleRating = { placeId: string; name: string | null; rating: number | null; count: number | null; mapsUrl: string | null };

/** Pulls a Place ID or a place name out of what the agency pasted. */
export function parseGoogleInput(input: string): { placeId?: string; query?: string } | null {
  const value = input.trim();
  if (!value) return null;
  if (/^ChIJ[A-Za-z0-9_-]{10,}$/.test(value)) return { placeId: value };
  const pid = value.match(/place_id[:=]([A-Za-z0-9_-]+)/);
  if (pid) return { placeId: pid[1] };
  const name = value.match(/\/maps\/place\/([^/@?]+)/);
  if (name) return { query: decodeURIComponent(name[1].replace(/\+/g, " ")) };
  if (/^https?:\/\//.test(value)) return { query: value };
  return { query: value };
}

async function placesFetch(path: string, init: RequestInit & { body?: string }) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  const res = await fetch(`https://places.googleapis.com/v1/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": path.startsWith("places:") ? FIELDS.split(",").map((f) => `places.${f}`).join(",") : FIELDS },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function lookupGooglePlace(input: string, agencyName: string): Promise<GoogleRating | null> {
  const parsed = parseGoogleInput(input);
  if (!parsed) return null;
  let place: Place | null = null;
  if (parsed.placeId) {
    place = (await placesFetch(`places/${encodeURIComponent(parsed.placeId)}`, { method: "GET" })) as Place | null;
  } else {
    const data = (await placesFetch("places:searchText", {
      method: "POST",
      body: JSON.stringify({ textQuery: parsed.query?.startsWith("http") ? agencyName : parsed.query, regionCode: "JO", maxResultCount: 1 }),
    })) as { places?: Place[] } | null;
    place = data?.places?.[0] ?? null;
  }
  if (!place) return null;
  return { placeId: place.id, name: place.displayName?.text ?? null, rating: place.rating ?? null, count: place.userRatingCount ?? null, mapsUrl: place.googleMapsUri ?? null };
}

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

/** Saves the link and, when possible, the current rating. */
export async function connectGoogle(agencyId: string, agencyName: string, input: string | null) {
  const db = await getDb();
  if (!input?.trim()) {
    await db.update(agencies).set({ googlePlaceId: null, googleMapsUrl: null, googleRating: null, googleRatingCount: null, googleFetchedAt: null }).where(eq(agencies.id, agencyId));
    return { status: "cleared" as const };
  }
  const found = await lookupGooglePlace(input, agencyName).catch(() => null);
  const url = input.trim().startsWith("http") ? input.trim() : found?.mapsUrl ?? null;
  await db
    .update(agencies)
    .set({
      googleMapsUrl: found?.mapsUrl ?? url,
      googlePlaceId: found?.placeId ?? null,
      googleRating: found?.rating ?? null,
      googleRatingCount: found?.count ?? null,
      googleFetchedAt: found ? new Date() : null,
    })
    .where(eq(agencies.id, agencyId));
  return { status: found ? ("connected" as const) : googleConfigured() ? ("not_found" as const) : ("saved" as const), place: found };
}

/** Refreshes every connected agency (daily cron). */
export async function refreshAllGoogleRatings() {
  const db = await getDb();
  const rows = await db.select({ id: agencies.id, placeId: agencies.googlePlaceId, name: agencies.name }).from(agencies);
  let updated = 0;
  for (const row of rows) {
    if (!row.placeId) continue;
    const found = await lookupGooglePlace(row.placeId, row.name).catch(() => null);
    if (!found) continue;
    await db.update(agencies).set({ googleRating: found.rating, googleRatingCount: found.count, googleMapsUrl: found.mapsUrl, googleFetchedAt: new Date() }).where(eq(agencies.id, row.id));
    updated++;
  }
  return updated;
}
