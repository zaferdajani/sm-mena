import { expect, test } from "@playwright/test";

test("hire index links to service pages with agency cards, price guide and FAQ", async ({ page }) => {
  await page.goto("/en/hire");
  await page.getByTestId("hire-service-link").filter({ hasText: "Facebook and Instagram ads" }).click();
  await expect(page).toHaveURL(/\/en\/hire\/ads_meta$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Best Facebook and Instagram ads agencies in Jordan");
  await expect(page.getByTestId("hire-cards").locator("li").first()).toBeVisible();
  await expect(page.getByText("How much does Facebook and Instagram ads cost in Jordan?")).toBeVisible();
  const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(jsonLd).toContain('"FAQPage"');
});

test("city hire pages and sitemap", async ({ page, request }) => {
  await page.goto("/ar/hire/ads_meta/amman");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("عمّان");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/ar/hire/ads_meta");
  expect(sitemap).toContain("/ar/a/nakhla.studio");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /ar/studio");
});
