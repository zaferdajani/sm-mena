import { expect, test } from "@playwright/test";
import { joinAgency } from "./helpers";

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

// The platform links on Studio → Page: at phone widths the address field drops to its own
// line instead of being squeezed beside the platform picker (it was 26 px wide at 320 px).
test("Studio platform links stay typeable on small phones", async ({ page }) => {
  await joinAgency(page, "swissplat");
  for (const locale of ["ar", "en"] as const) {
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}/studio/profile`);
      const rows = page.getByTestId("social-rows");
      await expect(rows).toBeVisible();
      const widths = await rows.locator('input[name="instagram"], input[name="socialValue"]').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
      expect(widths.length).toBeGreaterThan(1);
      for (const w of widths) expect(w, `${locale} ${width}`).toBeGreaterThanOrEqual(Math.min(200, width - 120));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${locale} ${width} overflow`).toBeLessThanOrEqual(1);
    }
  }
});
