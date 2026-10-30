import { devices, expect, test, type Page } from "@playwright/test";
import { joinAgency } from "./helpers";

// The Founding 100 (docs/39): the first 100 real providers are in the cohort. The full suite
// creates well over 100 providers, so this runs in its own project before the mobile and
// desktop projects (playwright.config.ts): later, a new provider's seat is past 100 and
// "not a member" would be the right answer.

async function checkSeat(page: Page) {
  await joinAgency(page, "seat");
  await page.goto("/ar/studio");
  const card = page.getByTestId("founding-panel");
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("data-member", "true");
  // Every approved benefit renders (a missing message key would break the page).
  await expect(card.locator("li")).toHaveCount(7);
  await expect(card).toContainText("7%");
}

test("a new provider gets a founding seat and a share card in the studio", async ({ page }) => {
  await checkSeat(page);
});

test.describe("on a phone", () => {
  test.use({ viewport: devices["Pixel 7"].viewport, isMobile: true, hasTouch: true, userAgent: devices["Pixel 7"].userAgent });
  test("a new provider gets a founding seat and a share card in the studio", async ({ page }) => {
    await checkSeat(page);
  });
});
