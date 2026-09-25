// Re-creates the demo agencies with their photos in the current storage
// (Supabase Storage). Needed once after leaving Fly: the demo photos lived on
// the Fly disk, the database rows pointing at them moved to Supabase.
// Run from GitHub Actions → Maintenance → rebuild-demo-media (docs/27-vercel.md).
//
// Only demo agencies (is_demo) are touched, and only those without contracts
// or NDAs (those rows must never disappear). Real agencies are never changed;
// their missing files are listed so they can be re-uploaded.
import { eq, inArray, sql } from "drizzle-orm";
import { closeDb, getDb } from "./index";
import { agencies, appSettings, contracts, ndas, postImages, posts, projectRequests, users } from "./schema";
import { seed } from "./seed";
import { storage } from "../storage";

async function exists(key: string) {
  try {
    const res = await fetch(storage().url(key), { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  // --allow-local: for trying the script against local storage.
  if (process.env.STORAGE_PROVIDER !== "supabase" && !process.argv.includes("--allow-local")) throw new Error("Set STORAGE_PROVIDER=supabase (and the Supabase keys) first.");
  const db = await getDb();
  const [removed] = await db.select().from(appSettings).where(eq(appSettings.key, "demo_removed"));
  if (removed) {
    console.log("Demo data was removed by an admin; nothing to rebuild.");
  } else {
    const locked = new Set([
      ...(await db.select({ id: contracts.agencyId }).from(contracts)).map((r) => r.id),
      ...(await db.select({ id: ndas.agencyId }).from(ndas)).map((r) => r.id),
    ]);
    const demo = await db.select({ id: agencies.id, owner: agencies.ownerUserId, handle: agencies.handle }).from(agencies).where(eq(agencies.isDemo, true));
    const drop = demo.filter((d) => !locked.has(d.id));
    const kept = demo.filter((d) => locked.has(d.id));
    if (drop.length) await db.delete(users).where(inArray(users.id, drop.map((d) => d.owner))); // cascades to their agency, posts, reviews…
    await db.delete(projectRequests).where(eq(projectRequests.source, "demo"));
    await db.delete(appSettings).where(eq(appSettings.key, "demo_portfolio_v1"));
    console.log(`Removed ${drop.length} demo agencies to rebuild them${kept.length ? `; kept ${kept.length} with contracts/NDAs: ${kept.map((k) => k.handle).join(", ")}` : ""}.`);
    await seed({ restoreDemo: true });
  }

  // Files the database points at that are not in storage (real agencies included).
  const real = await db.select({ id: agencies.id, handle: agencies.handle, avatarKey: agencies.avatarKey }).from(agencies).where(eq(agencies.isDemo, false));
  let missing = 0;
  for (const a of real) {
    if (a.avatarKey && !(await exists(a.avatarKey))) {
      missing++;
      console.log(`Missing avatar: @${a.handle}`);
    }
  }
  const realIds = real.map((a) => a.id);
  const imgs = realIds.length
    ? await db
        .select({ key: postImages.key, handle: agencies.handle })
        .from(postImages)
        .innerJoin(posts, eq(postImages.postId, posts.id))
        .innerJoin(agencies, eq(posts.agencyId, agencies.id))
        .where(inArray(agencies.id, realIds))
    : [];
  for (const i of imgs) {
    if (!(await exists(i.key))) {
      missing++;
      console.log(`Missing post photo: @${i.handle} ${i.key}`);
    }
  }
  const [{ n }] = (await db.select({ n: sql<number>`count(*)::int` }).from(agencies)) as { n: number }[];
  console.log(`Done. ${n} agencies; ${missing} missing files on real agencies${missing ? " (ask them to re-upload)" : ""}.`);
}

main()
  .then(() => closeDb())
  .catch(async (error) => {
    console.error(error);
    await closeDb();
    process.exit(1);
  });
