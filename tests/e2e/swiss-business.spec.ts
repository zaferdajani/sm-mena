import { expect, test } from "@playwright/test";

test("business service discovery shares the Swiss page measure in Arabic and English", async ({ page }) => {
  for (const locale of ["ar", "en"] as const) {
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}/hire`);
      const surface = page.locator('[data-design-surface="hire-index"]');
      await expect(surface).toBeVisible();
      const rect = await surface.evaluate((node) => ({
        width: node.getBoundingClientRect().width,
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
      }));
      expect(rect.width).toBeLessThanOrEqual(Math.min(1088, rect.viewport) + 1);
      expect(rect.document).toBeLessThanOrEqual(rect.viewport + 1);
    }
  }
});

test("business request fields never overlap on narrow screens", async ({ page }) => {
  for (const locale of ["ar", "en"] as const) {
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}/request/new`);
      const form = page.getByTestId("request-form");
      if (!(await form.isVisible().catch(() => false))) {
        // Feature-gated routes are intentionally hidden outside the launch phase.
        test.skip(true, "Request feature is not enabled for this test environment");
      }
      const rect = await form.evaluate((node) => ({
        width: node.getBoundingClientRect().width,
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
      }));
      expect(rect.width).toBeLessThanOrEqual(rect.viewport + 1);
      expect(rect.document).toBeLessThanOrEqual(rect.viewport + 1);
      await expect(page.locator("#req-name")).toBeVisible();
      await expect(page.locator("#req-phone")).toBeVisible();
      const name = await page.locator("#req-name").boundingBox();
      const phone = await page.locator("#req-phone").boundingBox();
      expect(name).not.toBeNull();
      expect(phone).not.toBeNull();
      const intersect = Math.min(name!.x + name!.width, phone!.x + phone!.width) - Math.max(name!.x, phone!.x);
      const overlapY = Math.min(name!.y + name!.height, phone!.y + phone!.height) - Math.max(name!.y, phone!.y);
      expect(intersect > 1 && overlapY > 1).toBe(false);
    }
  }
});
