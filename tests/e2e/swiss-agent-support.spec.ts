import { expect, test } from "@playwright/test";

// Public support flows: no credentials or staged/production data are touched.
test("Swiss support workspace contains forms and reports in both directions", async ({ page }, info) => {
  for (const locale of ["ar", "en"] as const) {
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(`/${locale}/support`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      const root = page.locator('[data-design-surface="support-workspace"]');
      await expect(root).toBeVisible();
      await expect(root.locator("header")).toBeVisible();
      await expect(root.locator("#support-form")).toBeVisible();
      const measure = await root.evaluate((node) => ({
        width: node.getBoundingClientRect().width,
        viewport: document.documentElement.clientWidth,
        page: document.documentElement.scrollWidth,
      }));
      expect(measure.width, `${locale} ${width} frame`).toBeLessThanOrEqual(Math.min(1088, measure.viewport) + 1);
      expect(measure.page, `${locale} ${width} overflow`).toBeLessThanOrEqual(measure.viewport + 1);
      if (width === 390 || width === 1440) {
        await info.attach(`swiss-support-${locale}-${width}-${info.project.name}`, {
          body: await page.screenshot({ animations: "disabled" }), contentType: "image/png",
        });
      }
    }
  }
});

test("Swiss support thread missing-token state remains private, responsive and translated", async ({ page }) => {
  for (const locale of ["ar", "en"] as const) {
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}/support/t/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`);
      await expect(page.getByTestId("thread-missing")).toBeVisible();
      const sizes = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        page: document.documentElement.scrollWidth,
      }));
      expect(sizes.page).toBeLessThanOrEqual(sizes.viewport + 1);
    }
  }
});
