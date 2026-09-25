import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { COUNTRY_CODES } from "@/lib/countries";
import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { storage } from "@/lib/storage";

/**
 * Interface backgrounds (docs/24-backgrounds.md): an image or a looping video
 * shown behind the app for one country's interface (or all), optionally only
 * between two dates, e.g. the Saudi flag on Flag Day (11 March). Stored as one
 * JSON list in app_settings; media files go to storage under backgrounds/.
 */

const KEY = "theme.backgrounds";
export const BACKGROUND_SCOPES = ["all", ...COUNTRY_CODES] as const;

export const backgroundSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(80),
  scope: z.enum(BACKGROUND_SCOPES),
  kind: z.enum(["image", "video"]),
  mediaKey: z.string().max(200),
  /** Inclusive calendar days (YYYY-MM-DD) in the country's own time zone; empty = always. */
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  /** How much of the page colour covers the media, 0–95%, so text stays readable. */
  veil: z.number().int().min(0).max(95),
  enabled: z.boolean(),
  createdAt: z.string(),
});
export type Background = z.infer<typeof backgroundSchema>;

export async function listBackgrounds(): Promise<Background[]> {
  const db = await getDb();
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, KEY));
  const parsed = z.array(backgroundSchema).safeParse(row?.value ?? []);
  return parsed.success ? parsed.data : [];
}

async function save(list: Background[], by: string | null) {
  const db = await getDb();
  await db
    .insert(appSettings)
    .values({ key: KEY, value: list, updatedBy: by })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: list, updatedAt: new Date(), updatedBy: by } });
}

/** Today's date (YYYY-MM-DD) in a time zone. */
export const dayIn = (timeZone: string, now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

/**
 * The background to show for a country right now: a dated one (an occasion)
 * for that country, then a dated one for all countries, then the country's
 * undated default, then the undated default for all. Newest wins within each.
 */
export function pickBackground(list: Background[], country: string, today: string): Background | null {
  const live = list.filter((b) => b.enabled && (!b.startsOn || b.startsOn <= today) && (!b.endsOn || today <= b.endsOn));
  // Occasions (dated) beat defaults (undated); within each, the country's own beats "all".
  const rank = (b: Background) => (b.startsOn || b.endsOn ? 0 : 2) + (b.scope === country ? 0 : 1);
  const candidates = live.filter((b) => b.scope === country || b.scope === "all").sort((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt));
  return candidates[0] ?? null;
}

export async function addBackground(input: Omit<Background, "id" | "createdAt" | "mediaKey">, file: { body: Buffer; ext: "webp" | "jpg" | "png" | "mp4" | "webm"; contentType: string }, by: string | null) {
  const mediaKey = `backgrounds/${randomUUID()}.${file.ext}`;
  await storage().put(mediaKey, file.body, file.contentType);
  const bg: Background = { ...input, id: randomUUID(), mediaKey, createdAt: new Date().toISOString() };
  await save([bg, ...(await listBackgrounds())], by);
  return bg;
}

export async function setBackgroundEnabled(id: string, enabled: boolean, by: string | null) {
  await save((await listBackgrounds()).map((b) => (b.id === id ? { ...b, enabled } : b)), by);
}

export async function removeBackground(id: string, by: string | null) {
  const list = await listBackgrounds();
  const gone = list.find((b) => b.id === id);
  await save(list.filter((b) => b.id !== id), by);
  if (gone) await storage().remove([gone.mediaKey]).catch(() => {});
}
