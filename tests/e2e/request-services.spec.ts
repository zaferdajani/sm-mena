import { expect, test } from "@playwright/test";

// The request form's services come by category (one wall of 29 chips before): the first category is open, a
// chosen service opens its own category and stays in view above the list, and the form still submits `services`.
test("a business owner picks services by category on the request form", async ({ page }) => {
  await page.goto("/ar/request/new");
  const groups = page.getByTestId("service-groups");
  await expect(groups.getByTestId("service-group-social_media")).toHaveAttribute("open", "");
  await expect(groups.getByTestId("service-group-digital")).not.toHaveAttribute("open", "");
  // SEO is named in Arabic with the acronym kept.
  await groups.getByTestId("service-group-digital").locator("summary").click();
  await groups.locator('label:has(input[name="services"][value="seo"])').click();
  await expect(groups.getByTestId("chosen-services")).toContainText("تحسين الظهور في محركات البحث (SEO)");
  await expect(groups.getByTestId("service-group-digital").getByTestId("group-count")).toHaveText("1");
  // Dropping it from the chosen row unticks the chip.
  await groups.getByTestId("chosen-services").getByRole("button").first().click();
  await expect(page.locator('input[name="services"][value="seo"]')).not.toBeChecked();

  // A service in the link opens its category, and every category fits a phone.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ar/request/new?service=ads_meta");
  await expect(page.getByTestId("service-group-paid_media")).toHaveAttribute("open", "");
  await expect(page.locator('input[name="services"][value="ads_meta"]')).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});
