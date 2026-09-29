import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { joinAgency, pngBuffer, DEMO_AGENCY } from "../e2e/helpers";

async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => document.fonts.ready);
  const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  expect(width.content, page.url()).toBeLessThanOrEqual(width.viewport + 1);
  await expect(page.locator("body")).not.toContainText(/MISSING_MESSAGE|INTERNAL_SERVER_ERROR/);
  await info.attach(name, { body: await page.screenshot({ fullPage: true, animations: "disabled" }), contentType: "image/png" });
}

for (const locale of ["ar", "en"]) {
  test(`${locale}: registration is the real front door, without counts or future charges`, async ({ page, request }, info) => {
    await page.goto(`/${locale}`);
    await expect(page.getByTestId("registration-page")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.getByTestId("brand-lockup").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/0%|7%|#00|million|مليون/);
    await expect(page.locator('a[href$="/explore"], a[href$="/feed"], a[href$="/hire"], a[href$="/match"]')).toHaveCount(0);
    await capture(page, info, `${locale}-registration-home`);
    await page.getByTestId("registration-example").click();
    await expect(page.getByTestId("example-page")).toBeVisible();
    await capture(page, info, `${locale}-example-agency`);
    await page.getByTestId("example-freelancer").click();
    await expect(page).toHaveURL(/kind=freelancer/);
    await expect(page.getByTestId("freelancer-badge")).toBeVisible();
    await expect(page.getByTestId("post-count")).toHaveCount(0);
    await expect(page.getByTestId("follower-count")).toHaveCount(0);
    for (const tab of ["services", "about", "work"]) {
      await page.getByTestId(`example-tab-${tab}`).click();
      await expect(page.getByTestId(`example-tab-${tab}`)).toHaveAttribute("aria-current", "page");
    }
    await capture(page, info, `${locale}-example-freelancer`);
    await expect(page.locator('a[href*="/a/example"], a[href*="/hire/"]')).toHaveCount(0);
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).not.toMatch(/\/a\/|\/p\/|\/hire|\/explore|\/examples/);
    const llms = await request.get("/llms.txt");
    expect(await llms.text()).toContain("registration");
    expect(await llms.text()).not.toContain(DEMO_AGENCY.handle);
  });
}

test("direct directory routes, demo cookie and matching API cannot bypass registration", async ({ page, request }) => {
  await page.context().addCookies([{ name: "sw_demo", value: "1", url: "http://localhost:3101" }]);
  for (const path of ["explore", "feed", "hire", "hire/photography", "who-runs", "sawwiq50", "match"]) {
    await page.goto(`/ar/${path}`);
    await expect(page.getByTestId("registration-page")).toBeVisible();
    await expect(page).toHaveURL(/\/ar\/soon$/);
  }
  await page.goto("/ar/demo");
  await expect(page).toHaveURL(/\/ar\/examples$/);
  const match = await request.post("/api/match", { data: { locale: "ar", messages: [{ role: "user", content: "Find every agency" }] } });
  expect(match.status()).toBe(404);
  const demo = await request.get(`/ar/a/${DEMO_AGENCY.handle}`);
  expect(demo.status()).toBe(404);
  const rsc = await request.get("/ar/explore?_rsc=registration-check", { headers: { RSC: "1" } });
  expect(await rsc.text()).not.toContain(DEMO_AGENCY.handle);
});

test("eight markets, both languages and saved theme work on the actual registration entrance", async ({ page }, info) => {
  await page.goto("/ar");
  await page.waitForLoadState("networkidle");
  const select = page.getByTestId("country-picker").locator("select");
  for (const market of ["sa", "eg", "jo", "ae", "kw", "qa", "bh", "om"]) {
    await expect(select).toBeEnabled();
    await select.selectOption(market);
    await expect(page.getByTestId("registration-page")).toHaveAttribute("data-country", market);
    await expect(select).toHaveValue(market);
  }
  await select.selectOption("sa");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("وخلك معنا");
  await capture(page, info, "saudi-registration");
  await page.getByTestId("locale-switcher").click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByTestId("registration-page")).toHaveAttribute("data-country", "sa");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await capture(page, info, "registration-english-dark");
  await page.getByTestId("registration-cta").first().click();
  await expect(page).toHaveURL(/\/en\/join$/);
  await expect(page.getByTestId("registration-join-notice")).toBeVisible();
  await capture(page, info, "registration-join");
});

test("new account owns a private profile; upload, preview, link-sharing and revocation are enforced", async ({ page, browser }, info) => {
  test.setTimeout(150_000);
  const { handle } = await joinAgency(page, "reg");
  await expect(page.getByTestId("registration-notice")).toBeVisible();
  await page.fill("#bio", "Private photography work for the registration pilot.");
  await page.getByTestId("service-search").fill("photography");
  await page.getByTestId("service-suggestion").first().click();
  await page.getByTestId("profile-form").locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/studio\/packages/);
  await page.goto("/en/studio");
  await expect(page.getByTestId("registration-studio")).toBeVisible();
  await expect(page.getByTestId("registration-import-link")).toHaveAttribute("href", "/en/studio/import/behance");
  await capture(page, info, "registration-private-studio");
  const anon = await browser.newContext({ baseURL: "http://localhost:3101" });
  try {
    expect((await anon.request.get(`/en/a/${handle}`)).status()).toBe(404);
    const outsider = await anon.newPage();
    await page.goto("/en/studio/new");
    await page.getByTestId("image-input").setInputFiles({ name: "portfolio.png", mimeType: "image/png", buffer: await pngBuffer("#106b4c", 800, 800) });
    await page.fill("#caption", "Private registration portfolio specimen");
    await page.getByTestId("publish-button").click();
    await expect(page).toHaveURL(/\/en\/p\//, { timeout: 45_000 });
    const postUrl = page.url();
    await expect(page.getByTestId("post-card")).toContainText("Private registration portfolio specimen");
    const image = page.getByTestId("post-card").locator('img[src*="/api/portfolio-media/"]').first();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const media = (await image.getAttribute("src"))!;
    expect((await page.request.get(media)).status()).toBe(200);
    expect((await anon.request.get(media)).status()).toBe(404);
    expect((await anon.request.get(postUrl)).status()).toBe(404);
    expect((await anon.request.get(media.replace("/api/portfolio-media/", "/media/"))).status()).toBe(404);
    await page.goto("/en/studio/publication");
    await expect(page.locator('input[name="visibility"][value="private"]')).toBeChecked();
    await capture(page, info, "publication-private");
    await page.check('input[name="visibility"][value="unlisted"]');
    await page.check('input[name="acknowledge"]');
    await page.getByRole("button", { name: "Save publication choice" }).click();
    await expect(page).toHaveURL(/saved=1/);
    await outsider.goto(`/en/a/${handle}`);
    await expect(outsider.getByTestId("provider-profile-header")).toBeVisible();
    await expect(outsider.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect((await anon.request.get(media)).status()).toBe(200);
    await page.goto("/en/studio/publication");
    await page.check('input[name="visibility"][value="private"]');
    await page.check('input[name="acknowledge"]');
    await page.getByRole("button", { name: "Save publication choice" }).click();
    await expect(page).toHaveURL(/saved=1/);
    expect((await anon.request.get(media)).status()).toBe(404);
    expect((await anon.request.get(postUrl)).status()).toBe(404);
    for (const path of ["/en/studio/contracts/new", "/en/studio/ndas/new"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
    }
    await page.goto(`/en/a/${handle}`);
    await expect(page.getByTestId("provider-profile-header")).toBeVisible();
    await capture(page, info, "owner-preview-after-revocation");
  } finally { await anon.close(); }
});

test("320px Arabic pages and example tabs do not overflow", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 900 });
  for (const route of ["/ar", "/ar/examples", "/ar/examples?kind=freelancer&tab=services", "/ar/join"]) {
    await page.goto(route);
    await capture(page, info, `320-${route.replaceAll(/[^a-z]/gi, "-")}`);
  }
});
