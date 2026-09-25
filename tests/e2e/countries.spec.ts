import { expect, test } from "@playwright/test";

test("switching to Saudi Arabia shows Saudi agencies, cities and prices", async ({ page }) => {
  await page.goto("/en/feed");
  const picker = page.locator('[data-testid="country-picker"]:visible select');
  await expect(picker).toHaveValue("jo");
  await picker.selectOption("sa");
  await expect(page.getByRole("navigation", { name: "Agencies" }).getByText("najd.creative")).toBeVisible();

  await page.goto("/en/explore?tab=agencies");
  await expect(page.getByTestId("agency-row").first()).toBeVisible();
  const rows = await page.getByTestId("agency-row").allTextContents();
  expect(rows.join(" ")).toContain("@najd.creative");
  expect(rows.join(" ")).toContain("SAR");
  // Saudi agencies first; a Jordanian agency appears only if it serves Saudi Arabia, and says so.
  expect(rows[0]).not.toContain("Based in");
  for (const row of rows.filter((r) => r.includes("· Amman ·"))) expect(row).toContain("takes clients in 🇸🇦 Saudi Arabia");
  await page.getByTestId("filters-button").click();
  await expect(page.locator('select[name="city"] option', { hasText: "Riyadh" })).toHaveCount(1);
  await expect(page.locator('select[name="city"] option', { hasText: "Amman" })).toHaveCount(0);
  await expect(page.getByText("Monthly budget (SAR)")).toBeVisible();
});

test("hire pages work per country and list countries region-wide", async ({ page }) => {
  await page.goto("/en/hire/ads_meta");
  await expect(page.getByTestId("hire-countries")).toContainText("Saudi Arabia");
  await page.getByTestId("hire-countries").getByRole("link", { name: /Saudi Arabia/ }).click();
  await expect(page).toHaveURL(/\/en\/hire\/ads_meta\/sa$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Facebook and Instagram ads agencies in Saudi Arabia: work and prices");
  await expect(page.getByTestId("hire-cards")).toContainText("Jeddah Growth");
  await page.goto("/en/hire/ads_meta/dubai");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Dubai");
});

test("an agency in Egypt picks its country, then a city in it", async ({ page }) => {
  await page.goto("/en/join");
  await page.getByTestId("country-select").selectOption("eg");
  await expect(page.locator("#city option", { hasText: "Alexandria" })).toHaveCount(1);
  await expect(page.locator("#city option", { hasText: "Amman" })).toHaveCount(0);
});
