import "./setup-db";
import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/lib/db";
import { DEMO_TEXTS_FLAG, refreshDemoTexts } from "@/lib/db/demo-text-refresh";
import { DEMO_CAPTIONS, DEMO_REVIEWS } from "@/lib/db/demo-texts";
import { agencies, appSettings, packages, portfolioClients, posts, reviews } from "@/lib/db/schema";
import { seed } from "@/lib/db/seed";

afterAll(() => closeDb());

const arabic = (s: string | null | undefined) => /[؀-ۿ]/.test(s ?? "");

describe("demo texts in one language per agency", () => {
  it("seeds each demo agency in its own language with the other one as the translation", async () => {
    await seed({ quiet: true });
    const db = await getDb();
    const [nakhla] = await db.select().from(agencies).where(eq(agencies.handle, "nakhla.studio"));
    const [petra] = await db.select().from(agencies).where(eq(agencies.handle, "petra.growth"));
    expect(nakhla.contentLang).toBe("ar");
    expect(petra.contentLang).toBe("en");
    expect(arabic(petra.translation.name)).toBe(true);
    for (const a of [nakhla, petra]) {
      const own = await db.select().from(posts).where(eq(posts.agencyId, a.id));
      expect(own.length).toBeGreaterThan(0);
      for (const p of own) {
        expect(arabic(p.caption), `${a.handle}: ${p.caption}`).toBe(a.contentLang === "ar");
        if (p.result) expect(arabic(p.result), `${a.handle}: ${p.result}`).toBe(a.contentLang === "ar");
      }
      for (const pkg of await db.select().from(packages).where(eq(packages.agencyId, a.id))) {
        expect(arabic(pkg.title)).toBe(a.contentLang === "ar");
        expect(pkg.deliverables.every((d) => arabic(d) === (a.contentLang === "ar"))).toBe(true);
        expect(pkg.translation.title && arabic(pkg.translation.title) === (a.contentLang === "en")).toBe(true);
      }
      for (const r of await db.select().from(reviews).where(eq(reviews.agencyId, a.id))) expect(arabic(r.body)).toBe(a.contentLang === "ar");
    }
    const [cafe] = await db.select().from(portfolioClients).where(and(eq(portfolioClients.agencyId, nakhla.id), eq(portfolioClients.name, "مقهى الياسمين (تجريبي)")));
    expect(cafe.translation.name).toBe("Yasmeen Café (demo)");
  }, 300_000);

  it("brings older mixed rows to the agency's language once, and leaves them alone after that", async () => {
    const db = await getDb();
    await db.delete(appSettings).where(eq(appSettings.key, DEMO_TEXTS_FLAG));
    const [nakhla] = await db.select().from(agencies).where(eq(agencies.handle, "nakhla.studio"));
    const [post] = await db.select().from(posts).where(eq(posts.agencyId, nakhla.id)).limit(1);
    // An old seed left an English caption and result on an Arabic agency, and an English review.
    await db.update(posts).set({ caption: DEMO_CAPTIONS[1].en, result: "+180% reach in 30 days", translation: {} }).where(eq(posts.id, post.id));
    const [review] = await db.select().from(reviews).where(eq(reviews.agencyId, nakhla.id)).limit(1);
    await db.update(reviews).set({ reviewerName: DEMO_REVIEWS[1].en[0], reviewerBusiness: DEMO_REVIEWS[1].en[1], body: DEMO_REVIEWS[1].en[2] }).where(eq(reviews.id, review.id));
    await db.update(agencies).set({ contentLang: "ar" }).where(eq(agencies.handle, "petra.growth"));

    const first = await refreshDemoTexts();
    expect(first?.posts).toBeGreaterThanOrEqual(1);
    const [after] = await db.select().from(posts).where(eq(posts.id, post.id));
    expect(after.caption).toBe(DEMO_CAPTIONS[1].ar);
    expect(after.translation.caption).toBe(DEMO_CAPTIONS[1].en);
    expect(after.result).toBe("وصول أعلى بنسبة 180% خلال 30 يومًا");
    expect(after.translation.result).toBe("+180% reach in 30 days");
    expect(after.searchText).toContain("monthly content calendar");
    const [reviewAfter] = await db.select().from(reviews).where(eq(reviews.id, review.id));
    expect(reviewAfter.body).toBe(DEMO_REVIEWS[1].ar[2]);
    expect(reviewAfter.reviewerName).toBe("عمر");
    const [petra] = await db.select().from(agencies).where(eq(agencies.handle, "petra.growth"));
    expect(petra.contentLang).toBe("en");

    // Flagged as done: a second call is a no-op.
    expect(await refreshDemoTexts()).toBeNull();
    // Without the flag it still changes nothing, because every row already matches.
    await db.delete(appSettings).where(eq(appSettings.key, DEMO_TEXTS_FLAG));
    const again = await refreshDemoTexts();
    expect(again?.posts).toBe(0);
    expect(again?.reviews).toBe(0);
    expect(again?.packages).toBe(0);
  }, 300_000);
});
