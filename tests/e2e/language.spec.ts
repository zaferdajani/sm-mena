import { expect, test } from "@playwright/test";

test("an English phone in Amman is offered Arabic, and the choice is remembered", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US", timezoneId: "Asia/Amman" });
  const page = await context.newPage();
  await page.goto("/en/explore");
  const offer = page.getByTestId("language-offer");
  await expect(offer).toContainText("سوّق متاح بالعربية");
  await expect(offer.locator("p")).toHaveAttribute("dir", "rtl");
  await page.getByTestId("language-offer-accept").click();
  await expect(page).toHaveURL(/\/ar\/explore$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByTestId("language-offer")).toHaveCount(0);
  await context.close();
});

test("a visitor abroad is offered English once; a saved choice opens at /", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-GB", timezoneId: "Europe/London" });
  const page = await context.newPage();
  await page.goto("/ar");
  await expect(page.getByTestId("language-offer")).toContainText("Show it in English");
  await page.getByTestId("language-offer").getByRole("button", { name: "الإبقاء على هذه اللغة" }).click();
  await page.reload();
  await expect(page.getByTestId("language-offer")).toHaveCount(0);

  // Switching with the header toggle saves the choice: "/" now opens English.
  await page.locator('[data-testid="locale-switcher"]:visible').first().click();
  await expect(page).toHaveURL(/\/en$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await context.close();
});

test("search engines and first-time visitors get Arabic at / with hreflang alternates", async ({ page, request }) => {
  const res = await request.get("/", { maxRedirects: 0 });
  expect(res.headers().location).toMatch(/\/ar$/);
  await page.goto("/ar");
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
});
