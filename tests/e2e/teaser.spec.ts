import { expect, test } from "@playwright/test";
import { joinAgency } from "./helpers";

// The pre-launch teaser (docs/39-teaser.md): live counts per country and city,
// and every call to action opens /join.

test("the teaser shows every country and sends providers to /join", async ({ page }) => {
  await page.goto("/ar/soon");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByTestId("teaser-map").locator("[data-country]")).toHaveCount(8);
  await expect(page.getByTestId("teaser-countries").locator("li")).toHaveCount(8);
  // The next founding seat is shown as #0001-style, and sharing starts with WhatsApp.
  await expect(page.getByTestId("teaser-next-seat")).toHaveText(/^#\d{4,}$/);
  await expect(page.getByTestId("teaser-whatsapp")).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByTestId("teaser-cta").first().click();
  await expect(page).toHaveURL(/\/ar\/join$/);
});

test("the teaser has an English version", async ({ page }) => {
  await page.goto("/en/soon");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("platform of platforms");
});

test("a new provider gets a founding seat and a share card in the studio", async ({ page }) => {
  await joinAgency(page, "seat");
  await page.goto("/ar/studio");
  const card = page.getByTestId("seat-card");
  await expect(card).toBeVisible();
  await expect(page.getByTestId("seat-number")).toHaveText(/^#\d{4,}$/);
  await expect(page.getByTestId("seat-whatsapp")).toHaveAttribute("href", /wa\.me/);
  // The claimed seat is the first, already ticked, setup step.
  await expect(page.getByTestId("setup-seat")).toHaveAttribute("data-done", "true");
});
