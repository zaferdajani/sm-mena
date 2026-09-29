import { expect, test } from "@playwright/test";
import { joinAgency } from "./helpers";

for (const locale of ["ar", "en"]) {
  test(`${locale}: setup has one focused task and restores normal navigation on exit`, async ({ page }, info) => {
    await joinAgency(page, "wizfocus", { stay: true });
    await page.goto(`/${locale}/portfolio-setup`);
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator('[data-onboarding-focused="true"]')).toBeVisible();
      await expect(page.locator('.sw-app > aside')).toBeHidden();
      await expect(page.locator('[data-app-nav]')).toBeHidden();
      await expect(page.getByTestId("site-footer")).toBeHidden();
      await expect(page.locator('[data-app-header]')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
      await info.attach(`focused-${locale}-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    }
    await page.getByTestId("setup-later").click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/studio$`));
    await expect(page.locator('[data-onboarding-focused="true"]')).toHaveCount(0);
    await expect(page.getByTestId("site-footer")).toBeVisible();
    await expect(page.locator('.sw-app > aside')).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('[data-app-nav]')).toBeVisible();
  });
}
