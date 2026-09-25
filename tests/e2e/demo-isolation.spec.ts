import { expect, test } from "@playwright/test";

// What a real visitor sees versus the labelled demo view (docs/31-trust-and-demo.md).
// playwright.config turns the demo view on for every test; these start without it.
const realVisitor = { cookies: [], origins: [] };

test.describe("a real visitor", () => {
  test.use({ storageState: realVisitor });

  test("never sees demo agencies on hire pages, and a sample agency's own page says so", async ({ page }) => {
    await page.goto("/en/hire/smm_management/amman");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId("demo-badge")).toHaveCount(0);
    await expect(page.getByTestId("demo-banner")).toHaveCount(0);
    // Prices describe real agencies only, with the sample size and date, or say there are too few.
    await expect(page.getByTestId("price-label").or(page.getByTestId("price-none"))).toBeVisible();

    await page.goto("/en/a/nakhla.studio");
    await expect(page.getByTestId("demo-notice")).toBeVisible();
    // No structured data about sample businesses.
    await expect(page.locator('script[type="application/ld+json"]', { hasText: "nakhla.studio" })).toHaveCount(0);
  });

  test("can open the demo from an empty state and leave it again", async ({ page }) => {
    await page.goto("/en/hire/smm_management/amman");
    const enter = page.getByTestId("demo-enter");
    test.skip((await enter.count()) === 0, "real agencies created by other tests fill this page");
    await enter.click();
    await expect(page.getByTestId("demo-banner")).toBeVisible();
    await expect(page.getByTestId("demo-badge").first()).toBeVisible();
    await page.getByTestId("demo-banner").getByTestId("demo-exit").click();
    await expect(page.getByTestId("demo-banner")).toHaveCount(0);
    await expect(page.getByTestId("demo-badge")).toHaveCount(0);
  });
});

test("the demo view labels sample agencies and says where requests go", async ({ page }) => {
  await page.goto("/en/hire/smm_management/amman");
  await expect(page.getByTestId("demo-banner")).toBeVisible();
  await expect(page.getByTestId("demo-badge").first()).toBeVisible();
  await page.goto("/en/request/new");
  await expect(page.getByTestId("demo-request-note")).toBeVisible();
  await page.getByTestId("demo-banner").getByTestId("demo-exit").click();
  await expect(page.getByTestId("demo-banner")).toHaveCount(0);
  await expect(page.getByTestId("demo-request-note")).toHaveCount(0);
});
