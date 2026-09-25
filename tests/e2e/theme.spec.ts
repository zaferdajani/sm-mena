import { expect, test } from "@playwright/test";

// Light for everyone by default, even when the device is in dark mode; dark only when chosen.
test.use({ colorScheme: "dark" });

test("light by default, dark when chosen and remembered", async ({ page }) => {
  await page.goto("/ar/feed");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(242, 242, 237)");
  await page.locator('[data-testid="theme-toggle"]:visible').first().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator('[data-testid="theme-toggle"]:visible').first().click();
  await page.reload();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
});
