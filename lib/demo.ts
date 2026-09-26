import { eq, type SQL } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDb } from "@/lib/db";
import { agencies, appSettings } from "@/lib/db/schema";

/**
 * The demo at /demo (docs/30-demo.md): the same app and database, shown with
 * the demo agencies only, and no sign-in needed. A cookie turns it on for one
 * browser; nothing links to it. Because it is the same code, every change to
 * the platform shows up in the demo too.
 *
 * - Demo mode: listings, matching and prices use demo agencies only; real
 *   agencies' pages are not found. Requests are stored as demo requests, which
 *   real agencies never see (lib/data/requests.ts).
 * - Main site: demo agencies are listed too until an admin hides them
 *   (Admin → Agencies), which keeps them for the demo.
 */
export const DEMO_COOKIE = "sw_demo";
const HIDDEN_ON_MAIN = "demo_hidden_on_main";

/** Demo agencies visitors can try the studio as (fictional, seeded; lib/db/seed.ts). */
export const DEMO_STUDIO_HANDLES = ["nakhla.studio", "petra.growth"] as const;

/** Whether this browser is in the demo. False outside a request (scripts, unit tests). */
export const isDemoMode = cache(async (): Promise<boolean> => {
  try {
    return (await cookies()).get(DEMO_COOKIE)?.value === "1";
  } catch {
    return false;
  }
});

/** Whether an admin hid the demo agencies from the main site. */
export const demoHiddenOnMain = cache(async (): Promise<boolean> => {
  const db = await getDb();
  const [row] = await db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, HIDDEN_ON_MAIN));
  return row?.value === true;
});

export async function setDemoHiddenOnMain(hidden: boolean, by: string | null) {
  const db = await getDb();
  await db
    .insert(appSettings)
    .values({ key: HIDDEN_ON_MAIN, value: hidden, updatedBy: by })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: hidden, updatedAt: new Date(), updatedBy: by } });
}

/** Which agencies a listing may show. */
export function scopeFor(demo: boolean, hiddenOnMain: boolean): SQL | undefined {
  if (demo) return eq(agencies.isDemo, true);
  return hiddenOnMain ? eq(agencies.isDemo, false) : undefined;
}

/** Whether an agency's pages are shown. */
export function visibleIn(agency: { isDemo: boolean }, demo: boolean, hiddenOnMain: boolean): boolean {
  return demo ? agency.isDemo : !(hiddenOnMain && agency.isDemo);
}

/** The agency condition for the current visitor's listings (undefined: no limit). */
export async function agencyScope(): Promise<SQL | undefined> {
  const demo = await isDemoMode();
  return scopeFor(demo, demo ? false : await demoHiddenOnMain());
}

/** Whether the current visitor may see this agency's page and posts. */
export async function agencyVisible(agency: { isDemo: boolean }): Promise<boolean> {
  const demo = await isDemoMode();
  return visibleIn(agency, demo, demo ? false : await demoHiddenOnMain());
}
