import { expect, test } from "@playwright/test";

test("root redirects to Arabic", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/ar$/);
});

test("Arabic home renders right-to-left", async ({ page }) => {
  await page.goto("/ar");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("dir", "rtl");
  await expect(html).toHaveAttribute("lang", "ar");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "وكالتك الصح، بثلاث خطوات",
  );
});

test("English home renders left-to-right", async ({ page }) => {
  await page.goto("/en");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("dir", "ltr");
  await expect(html).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The right agency, in three steps",
  );
});

test("locale switcher toggles language and direction", async ({ page }) => {
  await page.goto("/ar");
  await page.getByTestId("locale-switcher").click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await page.getByTestId("locale-switcher").click();
  await expect(page).toHaveURL(/\/ar$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("page has no horizontal scroll", async ({ page }) => {
  await page.goto("/ar");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("unknown locale returns 404", async ({ page }) => {
  const response = await page.goto("/fr");
  expect(response?.status()).toBe(404);
});

test.describe("with an English browser", () => {
  test.use({ locale: "en-US" });

  test("root still opens in Arabic", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/ar$/);
  });
});
