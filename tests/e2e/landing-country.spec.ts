import { expect, test, type Page } from "@playwright/test";

// A time zone outside the region, so the first-visit guess comes from the
// server (saved choice or IP country), not from the test machine's clock.
test.use({ timezoneId: "UTC" });

async function noSideScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test("a saved country shows the landing page for that country", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "sw_country", value: "sa", url: baseURL! }]);
  await page.goto("/ar");
  await expect(page.locator("#cities-title")).toHaveText("في كل مدن السعودية");
  await expect(page.locator(".sw-city__name").first()).toHaveText("الرياض");
  await expect(page.getByText("اعثر على وكالة التسويق المناسبة في السعودية").first()).toBeAttached();
  await expect(page.locator(".sw-footer__tagline")).toHaveText("فريقك التسويقي يبدأ من هنا · السعودية");
  await expect(page.locator(".sw-header [data-testid=country-picker] select")).toHaveValue("sa");
  await expect(page.locator(".sw-ledger")).toContainText("ر.س");
  await expect(page.locator(".sw-ledger")).not.toContainText("د.أ");
});

test("with no saved country, the IP country is the default and can be changed", async ({ page, context, baseURL }) => {
  await context.setExtraHTTPHeaders({ "x-vercel-ip-country": "AE" });
  await page.goto("/en");
  await expect(page.locator("#cities-title")).toHaveText("Across the United Arab Emirates");
  await expect(page.locator(".sw-city__name").first()).toHaveText("Dubai");
  const picker = page.locator(".sw-header [data-testid=country-picker] select");
  await expect(picker).toHaveValue("ae");
  // The first visit remembers the detected country.
  await expect.poll(async () => (await context.cookies(baseURL!)).find((c) => c.name === "sw_country")?.value).toBe("ae");

  // Switching follows everywhere, and wins over the IP country.
  await picker.selectOption("eg");
  await expect(page.locator("#cities-title")).toHaveText("Across Egypt");
  await expect(page.locator(".sw-city__name").first()).toHaveText("Cairo");
  await page.reload();
  await expect(page.locator("#cities-title")).toHaveText("Across Egypt");
});

test("without any hint the landing page stays on Jordan", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("#cities-title")).toHaveText("Across Jordan");
  await expect(page.locator(".sw-city__name").first()).toHaveText("Amman");
  await expect(page.locator(".sw-ledger")).toContainText("JOD 350");
});

for (const lang of ["ar", "en"] as const) {
  test(`the header picker fits a 375px phone (${lang})`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    await page.goto(`/${lang}`);
    const pill = page.locator(".sw-header [data-testid=country-picker]");
    await expect(pill).toBeVisible();
    await expect(page.locator(".sw-header .sw-switch")).toBeVisible();
    const [pillBox, switchBox] = [await pill.boundingBox(), await page.locator(".sw-header .sw-switch").boundingBox()];
    expect(pillBox!.x).toBeGreaterThanOrEqual(0);
    expect(switchBox!.x + switchBox!.width).toBeLessThanOrEqual(375);
    await noSideScroll(page);
  });
}
