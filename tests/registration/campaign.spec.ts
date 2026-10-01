import { expect, test, type Page } from "@playwright/test";

// Early-access campaign layer on the registration landing (docs/55). What it promises must be true today
// (free, no card, private by default), with no invented scarcity, counts or benefits.

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const inViewport = async (page: Page, testId: string) => page.getByTestId(testId).first().evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; });

for (const locale of ["ar", "en"]) {
  test(`${locale}: the launch announcement, cohort mark, promise line and cohort CTA are above the fold and truthful`, async ({ page }, info) => {
    await page.goto(`/${locale}`);
    await expect(page.getByTestId("registration-page")).toBeVisible();
    // 1. announcement strip, first thing on the page, with a working link
    const strip = page.getByTestId("launch-strip");
    await expect(strip).toBeVisible();
    await expect(strip).toContainText(locale === "ar" ? "سوّق قادم قريباً" : "Sawwiq is coming");
    await expect(strip).toContainText(locale === "ar" ? "التسجيل المبكر للدفعة الأولى مفتوح الآن" : "Early registration for the first cohort is open now");
    await expect(page.getByTestId("launch-strip-link")).toHaveAttribute("href", `/${locale}/join`);
    expect(await strip.evaluate((el) => el.compareDocumentPosition(document.querySelector("header")!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();
    // 2. cohort mark in the hero, before the headline
    const badge = page.getByTestId("launch-badge");
    await expect(badge).toContainText(locale === "ar" ? "الدفعة الأولى" : "The first cohort");
    expect(await badge.evaluate((el) => el.compareDocumentPosition(document.querySelector("h1")!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();
    // 3. headline kept, 4. cohort CTA, 5. promise line with exactly the three true statements
    await expect(page.getByRole("heading", { level: 1 })).toContainText(locale === "ar" ? "من البداية" : "from the beginning");
    const cta = page.getByTestId("registration-cta").first();
    await expect(cta).toHaveText(locale === "ar" ? "احجز مكانك في الدفعة الأولى" : "Join the first cohort");
    await expect(cta).toHaveAttribute("href", `/${locale}/join`);
    const trust = page.getByTestId("launch-trust").first();
    await expect(trust.locator("li")).toHaveCount(3);
    await expect(trust).toContainText(locale === "ar" ? "بدون بطاقة دفع" : "No payment card");
    await expect(trust).toContainText(locale === "ar" ? "خاصة" : "private");
    // above the fold on this project's viewport (390x844 phone, 1440x1000 desktop)
    for (const id of ["launch-strip", "launch-badge", "registration-cta"]) expect(await inViewport(page, id), `${id} above the fold`).toBe(true);
    // 7. why join early, after the product preview and before the Pioneer block
    const early = page.getByTestId("why-early");
    await expect(early.locator("li")).toHaveCount(4);
    expect(await early.evaluate((el) => el.compareDocumentPosition(document.querySelector('[data-testid="pioneer-invitation"]')!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();
    // no scarcity, counts or money claims anywhere on the page
    await expect(page.locator("body")).not.toContainText(/places left|seats left|closes tonight|hurry|limited time|متبقي|مقاعد|ينتهي الليلة|سارع|0%|7%|million|مليون/i);
    expect(await noOverflow(page)).toBe(true);
    await expect(page.locator("body")).not.toContainText(/MISSING_MESSAGE|INTERNAL_SERVER_ERROR/);
    await info.attach(`${locale}-campaign`, { body: await page.screenshot({ fullPage: true, animations: "disabled" }), contentType: "image/png" });
    // the CTA still leads to the real sign-up form
    await cta.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/join$`));
    await expect(page.locator("#handle")).toBeVisible();
  });
}

test("the strip link and the CTA are reachable by keyboard with a visible focus ring; entrance motion obeys reduced motion", async ({ page, browser }) => {
  await page.goto("/en");
  const focused = async () => page.evaluate(() => { const e = document.activeElement!; const cs = getComputedStyle(e); return { id: e.getAttribute("data-testid"), ring: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 }; });
  const seen: string[] = [];
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press("Tab");
    const f = await focused();
    if (f.id === "launch-strip-link" || f.id === "registration-cta") { expect(f.ring, `${f.id} focus ring`).toBe(true); seen.push(f.id); }
    if (seen.includes("registration-cta")) break;
  }
  expect(seen).toEqual(["launch-strip-link", "registration-cta"]);
  const quiet = await browser.newContext({ baseURL: "http://localhost:3101", reducedMotion: "reduce" });
  try {
    const p = await quiet.newPage();
    await p.goto("/ar");
    const names = await p.evaluate(() => ["[data-testid=launch-strip]", "[data-testid=launch-badge]", "h1"].map((s) => getComputedStyle(document.querySelector(s)!).animationName));
    expect(names.every((n) => n === "none")).toBe(true);
  } finally { await quiet.close(); }
});

test("the web app manifest points at what is open during registration", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  const urls = manifest.shortcuts.map((s: { url: string }) => s.url);
  expect(urls).toEqual(["/ar/join", "/ar/examples"]);
});
