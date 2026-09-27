import { expect, test } from "@playwright/test";

// Light by default even on a dark OS. A saved, explicit choice wins after reload.
test.use({ colorScheme: "dark" });

test("light by default, dark when chosen and remembered", async ({ page }) => {
  await page.goto("/ar/feed");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(248, 246, 239)");
  await page.waitForLoadState("networkidle");
  await page.locator('[data-testid="theme-toggle"]:visible').first().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(16, 36, 29)");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(16, 36, 29)");
  await page.waitForLoadState("networkidle");
  await page.locator('[data-testid="theme-toggle"]:visible').first().click();
  await page.reload();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(248, 246, 239)");
});
