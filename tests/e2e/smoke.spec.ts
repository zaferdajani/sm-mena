import { expect, test } from "@playwright/test";

test("root redirects to Arabic", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/ar$/);
});

test.describe("with an English browser", () => {
  test.use({ locale: "en-US" });
  test("root still opens in Arabic", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/ar$/);
  });
});

test("the front page is the landing page, and its calls to action open the app", async ({ page }) => {
  await page.goto("/ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".sw-bubble").first()).toHaveAttribute("href", "/ar/match");
  await expect(page.locator("#who")).toBeVisible(); // who we help, healthcare included
  await page.locator(".sw-switch").click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("Arabic feed renders right-to-left", async ({ page }) => {
  await page.goto("/ar/feed");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("اعثر على شركة التسويق والسوشيال ميديا المناسبة لنشاطك في الأردن");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
});

test("English feed renders left-to-right", async ({ page }) => {
  await page.goto("/en/feed");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find the right marketing and social media agency for your business in Jordan");
});

test("locale switcher keeps the page and flips direction", async ({ page }) => {
  await page.goto("/ar/explore");
  await page.locator('[data-testid="locale-switcher"]:visible').click();
  await expect(page).toHaveURL(/\/en\/explore$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("agency pages with dots in the handle keep their locale", async ({ page }) => {
  await page.goto("/en/a/nakhla.studio");
  await expect(page.getByTestId("follow-button")).toHaveText("Follow");
  await page.goto("/ar/a/nakhla.studio");
  await expect(page.getByTestId("follow-button")).toHaveText("متابعة");
});

test("pages have no horizontal scroll", async ({ page }) => {
  for (const path of ["/ar", "/ar/feed", "/ar/explore", "/ar/a/nakhla.studio", "/ar/hire/ads_meta"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("missing pages return 404", async ({ page }) => {
  expect((await page.goto("/fr"))?.status()).toBe(404);
  expect((await page.goto("/ar/a/no.such.agency"))?.status()).toBe(404);
  expect((await page.goto("/ar/p/00000000-0000-0000-0000-000000000000"))?.status()).toBe(404);
});
