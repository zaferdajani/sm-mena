import { expect, test } from "@playwright/test";

// The pre-launch teaser (docs/39-teaser.md): live counts per country and city,
// and every call to action opens /join.

test("the teaser shows every country and sends providers to /join", async ({ page }) => {
  await page.goto("/ar/soon");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByTestId("teaser-map").locator("[data-country]")).toHaveCount(8);
  await expect(page.getByTestId("teaser-countries").locator("li")).toHaveCount(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByTestId("teaser-cta").first().click();
  await expect(page).toHaveURL(/\/ar\/join$/);
});

test("the teaser has an English version", async ({ page }) => {
  await page.goto("/en/soon");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("first Arabic platform");
});
