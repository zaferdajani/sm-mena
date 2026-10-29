import { expect, test } from "@playwright/test";

test("owner communication pages share one contained Swiss page measure", async ({ page }) => {
  for (const locale of ["ar", "en"] as const) {
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [path, surface] of [
        ["/requests", "owner-requests"],
        ["/notifications", "notifications"],
        ["/chats", "conversations"],
        ["/saved", "saved-items"],
      ] as const) {
        await page.goto(`/${locale}${path}`);
        const root = page.locator(`[data-design-surface="${surface}"]`);
        await expect(root).toBeVisible();
        const measure = await root.evaluate((node) => ({
          width: node.getBoundingClientRect().width,
          viewport: document.documentElement.clientWidth,
          page: document.documentElement.scrollWidth,
        }));
        expect(measure.width).toBeLessThanOrEqual(Math.min(1088, measure.viewport) + 1);
        expect(measure.page, `${locale} ${width} ${path}`).toBeLessThanOrEqual(measure.viewport + 1);
        await expect(root.locator("header")).toBeVisible();
      }
    }
  }
});
