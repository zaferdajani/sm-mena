import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { DEMO_AGENCY, joinAgency } from "./helpers";

async function fitsViewport(page: Page) {
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(sizes.document).toBeLessThanOrEqual(sizes.viewport + 1);
  expect(sizes.body).toBeLessThanOrEqual(sizes.viewport + 1);
}

async function capture(page: Page, info: TestInfo, label: string) {
  await page.evaluate(() => document.fonts.ready);
  await info.attach(`profile-${info.project.name}-${label}`, {
    body: await page.screenshot({ fullPage: true, animations: "disabled" }),
    contentType: "image/png",
  });
}

for (const locale of ["ar", "en"]) {
  test(`${locale} provider profile preserves navigation and fits mobile/desktop`, async ({ page }, info) => {
    test.setTimeout(120_000);
    await page.setViewportSize(info.project.name === "mobile" ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/${locale}/a/${DEMO_AGENCY.handle}`);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    const header = page.getByTestId("provider-profile-header");
    await expect(header).toBeVisible();
    await expect(header).toHaveCSS("display", "grid");
    await expect(header).toHaveCSS("border-top-width", "4px");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(header.getByTestId("post-count")).toBeVisible();
    await expect(header.getByTestId("follower-count")).toBeVisible();
    await expect(page.getByTestId("contact-whatsapp")).toHaveAttribute("href", /wa\.me/);
    // Each contact action is a touch target, not an unexplained tiny icon.
    for (const button of await page.getByTestId("profile-contact-panel").locator("a, button").all()) {
      const box = await button.boundingBox();
      if (box) expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await fitsViewport(page);
    await capture(page, info, `${locale}-work`);

    const tabs = page.getByRole("tablist");
    await tabs.locator('a[href*="tab=about"]').click();
    await expect(page).toHaveURL(/tab=about/);
    await expect(page.getByTestId("package-list")).toBeVisible();
    await fitsViewport(page);
    await capture(page, info, `${locale}-about`);
    await tabs.locator('a[href*="tab=reviews"]').click();
    await expect(page).toHaveURL(/tab=reviews/);
    await fitsViewport(page);
    if (await tabs.locator('a[href*="tab=clients"]').count()) {
      await tabs.locator('a[href*="tab=clients"]').click();
      await expect(page).toHaveURL(/tab=clients/);
      await fitsViewport(page);
    }
    await tabs.locator('a').first().click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/a/${DEMO_AGENCY.handle.replaceAll(".", "\\.")}$`));
    await expect(page.getByTestId("contact-whatsapp")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test(`${locale} provider profile supports dark mode and readable portfolio tiles`, async ({ page }, info) => {
    await page.setViewportSize(info.project.name === "mobile" ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    // Sawwiq deliberately ignores OS dark mode unless the visitor chooses it.
    // Exercise the same saved preference that its theme toggle/head script use.
    await page.addInitScript(() => localStorage.setItem("sw_theme", "dark"));
    await page.goto(`/${locale}/a/${DEMO_AGENCY.handle}`);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByTestId("provider-profile-header")).toBeVisible();
    const grid = page.getByTestId("post-grid");
    if (await grid.count()) {
      const columns = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
      expect(columns).toBe(info.project.name === "mobile" ? 2 : 3);
      await expect(grid.locator("a").first()).toBeVisible();
    }
    await fitsViewport(page);
    await capture(page, info, `${locale}-dark`);
  });
}

test("a new provider has a usable profile without a logo, prices or reviews", async ({ page }, info) => {
  const { handle } = await joinAgency(page, "layout");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/ar/a/${handle}`);
  await expect(page.getByTestId("provider-profile-header")).toBeVisible();
  await expect(page.getByTestId("post-count")).toHaveText("0");
  await expect(page.getByTestId("contact-whatsapp")).toBeVisible();
  await expect(page.getByTestId("google-rating")).toHaveCount(0);
  await expect(page.getByTestId("package-list")).toHaveCount(0);
  await fitsViewport(page);
  // Presentation stress fixture only; no mutation of the provider's stored data.
  await page.getByRole("heading", { level: 1 }).evaluate((el) => {
    el.textContent = "استوديو التسويق AgencyWithALongUnbrokenNameForInternationalCreativeProduction";
  });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await fitsViewport(page);
  }
  await capture(page, info, "empty-long-name");
});
