import { expect, test } from "@playwright/test";

// During registration, routes that only make sense with the open directory send visitors to the landing
// itself instead of rendering a second landing inside the signed-out app shell.
for (const locale of ["ar", "en"]) {
  test(`${locale}: /about goes to the landing, once, without the app shell`, async ({ page }) => {
    await page.goto(`/${locale}/about`);
    await expect(page).toHaveURL(new RegExp(`/${locale}$`));
    await expect(page.getByTestId("registration-page")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByTestId("registration-cta").first()).toBeVisible();
  });
}
