import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("sw_role", "browse"));
});

for (const locale of ["ar", "en"]) {
  for (const width of [320, 390, 768, 1440, 1920]) {
    test(`${locale} landing separates headings and trust cards at ${width}px`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}?intro=0`);
      await page.evaluate(() => document.fonts.ready);
      const title = page.locator(".sw-trust__title");
      const grid = page.locator(".sw-bento");
      await expect(title).toBeVisible();
      const titleBox = await title.boundingBox();
      const gridBox = await grid.boundingBox();
      expect(titleBox).not.toBeNull();
      expect(gridBox).not.toBeNull();
      expect(gridBox!.y - titleBox!.y - titleBox!.height).toBeGreaterThanOrEqual(23);
      expect(await grid.evaluate((el) => parseFloat(getComputedStyle(el).rowGap))).toBeGreaterThanOrEqual(12);
      expect(await page.locator(".sw-lead").first().evaluate((el) => parseFloat(getComputedStyle(el).marginBlockStart))).toBeGreaterThanOrEqual(16);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
      const contained = await grid.evaluate((el) => {
        const frame = el.getBoundingClientRect();
        return Array.from(el.children).every((child) => {
          const rect = child.getBoundingClientRect();
          return rect.left >= frame.left - 1 && rect.right <= frame.right + 1;
        });
      });
      expect(contained).toBe(true);
      await info.attach(`trust-${locale}-${width}`, { body: await page.locator(".sw-trust").screenshot(), contentType: "image/png" });
    });
  }
  for (const theme of ["light", "dark"] as const) {
    test(`${locale} Explore separates filters, providers and footer in ${theme}`, async ({ page }, info) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(`/${locale}/explore?tab=agencies`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const grid = page.getByTestId("explore-agency-grid");
      await expect(grid).toBeVisible();
      expect(await grid.evaluate((el) => parseFloat(getComputedStyle(el).gap))).toBeGreaterThanOrEqual(16);
      const card = page.getByTestId("explore-agency-card").first();
      await expect(card).toBeVisible();
      expect(await card.evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth))).toBeGreaterThanOrEqual(1);
      const results = await page.getByTestId("explore-results").boundingBox();
      const footer = await page.getByTestId("site-footer").boundingBox();
      expect(results).not.toBeNull(); expect(footer).not.toBeNull();
      expect(footer!.y - results!.y - results!.height).toBeGreaterThanOrEqual(24);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
      await info.attach(`explore-${locale}-${theme}`, { body: await page.screenshot(), contentType: "image/png" });
    });
  }
}
