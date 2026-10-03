import { expect, test } from "@playwright/test";

// The hero visual is a set of slides; the first carries the platform statement in bold, with no "first" claim.
for (const [locale, statement, banned] of [["ar", "المنصة التي تجمع أصحاب الأعمال", /أول منصة|الأولى في/], ["en", "The platform that connects business owners", /first (Arabic )?platform/i]] as const) {
  test(`${locale}: hero slides carry the platform statement and switch by the dots`, async ({ page }) => {
    await page.goto(`/${locale}`);
    const slides = page.getByTestId("hero-slides");
    await expect(slides).toBeVisible();
    await expect(slides.locator("figure")).toHaveCount(3);
    const first = slides.locator('figure[data-active="true"]');
    await expect(first).toHaveCount(1);
    await expect(first.locator("strong")).toContainText(statement);
    expect(await page.locator("main").innerText()).not.toMatch(banned);
    await page.getByTestId("hero-slide-dot-2").click();
    await expect(slides).toHaveAttribute("data-active-index", "1");
    await expect(slides.locator('figure[data-active="true"] img')).toHaveAttribute("src", /team/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}
