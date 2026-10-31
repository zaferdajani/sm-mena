// Brings EXISTING demo agencies (is_demo) to the one-language texts of
// lib/db/demo-texts.ts without deleting anything: older seeds mixed English
// into Arabic pages (captions, results, package lines, reviews) and showed
// «(تجريبي)» inside client names on English pages. Each row that still carries
// one side of a known pair gets the agency's language and the other side as its
// translation. Deterministic (the pairs decide, not the clock) and idempotent:
// an app_settings flag runs it once; calling it again changes nothing.
// No "server-only": the seed and the staging refresh run it from plain Node.
import { and, eq, inArray } from "drizzle-orm";
import { otherLang, translationSearchText } from "@/lib/content-lang";
import { normalizeForSearch } from "@/lib/text";
import { getDb } from "./index";
import { DEMO_PROFILES } from "./demo-profiles";
import { DEMO_CAPTIONS, DEMO_PACKAGES, DEMO_RESULTS, DEMO_REVIEWS, DEMO_REVIEW_REPLY, demoLang, sidesOf, type Bi, type DemoReview } from "./demo-texts";
import { DEMO_TRANSLATIONS_AR } from "./demo-translations";
import { agencies, appSettings, packages, portfolioClients, posts, reviews } from "./schema";

export const DEMO_TEXTS_FLAG = "demo_texts_v2";

/** The pair a text belongs to, by either side. */
function pairOf(pairs: Bi[], text: string | null | undefined): Bi | null {
  if (!text) return null;
  return pairs.find((p) => p.ar === text || p.en === text) ?? null;
}

/** The agencies with their own captions, packages and reviews (lib/db/seed.ts), read lazily to avoid a cycle with the seed. */
async function ownTexts() {
  const { DEMO_AGENCIES } = await import("./seed");
  const captions: Bi[] = [];
  const packageTitles: { title: Bi; deliverables: Bi[] }[] = [];
  const reviewPairs: { ar: DemoReview; en: DemoReview }[] = [];
  for (const d of DEMO_AGENCIES) {
    captions.push(...(d.captions ?? []));
    for (const p of d.packages ?? []) packageTitles.push({ title: p.title, deliverables: p.deliverables ?? [] });
    reviewPairs.push(...(d.reviews ?? []));
  }
  return { captions, packageTitles, reviewPairs };
}

export type DemoTextRefresh = { agencies: number; posts: number; packages: number; reviews: number; clients: number };

export async function refreshDemoTexts(log: (...a: unknown[]) => void = () => {}): Promise<DemoTextRefresh | null> {
  const db = await getDb();
  const [done] = await db.select().from(appSettings).where(eq(appSettings.key, DEMO_TEXTS_FLAG));
  if (done) return null;
  const own = await ownTexts();
  const captionPairs = [...DEMO_CAPTIONS, ...own.captions];
  const resultPairs = sidesOf(DEMO_RESULTS);
  const reviewPairs = [...DEMO_REVIEWS, ...own.reviewPairs];
  const packagePairs = [...DEMO_PACKAGES, ...own.packageTitles];
  const counts: DemoTextRefresh = { agencies: 0, posts: 0, packages: 0, reviews: 0, clients: 0 };

  const demo = await db.select({ id: agencies.id, handle: agencies.handle, name: agencies.name, translation: agencies.translation }).from(agencies).where(eq(agencies.isDemo, true));
  for (const a of demo) {
    const lang = demoLang(a.name);
    const other = otherLang(lang);
    const ar = lang === "en" ? DEMO_TRANSLATIONS_AR[a.handle] : undefined;
    const translation = ar ? { ...a.translation, name: ar.name, bio: ar.bio } : a.translation;
    await db.update(agencies).set({ contentLang: lang, translation }).where(eq(agencies.id, a.id));
    counts.agencies++;
    const agencyNames = `${a.name} ${translation?.name ?? ""}`;

    const rows = await db.select({ id: posts.id, caption: posts.caption, result: posts.result, translation: posts.translation }).from(posts).where(eq(posts.agencyId, a.id));
    for (const p of rows) {
      const caption = pairOf(captionPairs, p.caption);
      const result = pairOf(resultPairs, p.result);
      if (!caption && !result) continue;
      const next = {
        caption: caption ? caption[lang] : p.caption,
        result: result ? result[lang] : p.result,
        translation: { ...p.translation, ...(caption ? { caption: caption[other] } : {}), ...(result ? { result: result[other] } : {}) },
      };
      if (next.caption === p.caption && next.result === p.result && JSON.stringify(next.translation) === JSON.stringify(p.translation)) continue;
      await db
        .update(posts)
        .set({ ...next, searchText: normalizeForSearch(`${next.caption} ${translationSearchText(next.translation)} ${agencyNames}`) })
        .where(eq(posts.id, p.id));
      counts.posts++;
    }

    const pkgs = await db.select({ id: packages.id, title: packages.title, deliverables: packages.deliverables, translation: packages.translation }).from(packages).where(eq(packages.agencyId, a.id));
    for (const pkg of pkgs) {
      const pair = packagePairs.find((x) => x.title.ar === pkg.title || x.title.en === pkg.title);
      if (!pair) continue;
      const next = { title: pair.title[lang], deliverables: pair.deliverables.map((d) => d[lang]), translation: { ...pkg.translation, title: pair.title[other], deliverables: pair.deliverables.map((d) => d[other]) } };
      if (next.title === pkg.title && JSON.stringify(next.deliverables) === JSON.stringify(pkg.deliverables) && JSON.stringify(next.translation) === JSON.stringify(pkg.translation)) continue;
      await db.update(packages).set(next).where(eq(packages.id, pkg.id));
      counts.packages++;
    }

    const revs = await db.select({ id: reviews.id, reviewerName: reviews.reviewerName, reviewerBusiness: reviews.reviewerBusiness, body: reviews.body, reply: reviews.reply }).from(reviews).where(eq(reviews.agencyId, a.id));
    for (const rev of revs) {
      const pair = reviewPairs.find((x) => x.ar[2] === rev.body || x.en[2] === rev.body);
      const reply = rev.reply === DEMO_REVIEW_REPLY.ar || rev.reply === DEMO_REVIEW_REPLY.en ? DEMO_REVIEW_REPLY[lang] : rev.reply;
      const [reviewerName, reviewerBusiness, body] = pair ? pair[lang] : [rev.reviewerName, rev.reviewerBusiness, rev.body];
      if (reviewerName === rev.reviewerName && reviewerBusiness === rev.reviewerBusiness && body === rev.body && reply === rev.reply) continue;
      await db.update(reviews).set({ reviewerName, reviewerBusiness, body, reply }).where(eq(reviews.id, rev.id));
      counts.reviews++;
    }

    const profile = DEMO_PROFILES[a.handle];
    for (const c of profile?.clients ?? []) {
      if (!c.translation) continue;
      const updated = await db
        .update(portfolioClients)
        .set({ translation: c.translation })
        .where(and(eq(portfolioClients.agencyId, a.id), inArray(portfolioClients.name, [c.name, c.translation.name])))
        .returning({ id: portfolioClients.id });
      counts.clients += updated.length;
    }
  }

  await db.insert(appSettings).values({ key: DEMO_TEXTS_FLAG, value: true }).onConflictDoNothing();
  log(`Demo texts in one language per agency: ${counts.agencies} agencies, ${counts.posts} posts, ${counts.packages} packages, ${counts.reviews} reviews, ${counts.clients} clients.`);
  return counts;
}
