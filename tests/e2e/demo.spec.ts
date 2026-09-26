import { expect, test } from "@playwright/test";

// The typed /demo link (docs/35-demo-link.md). playwright.config turns the demo
// view on for every test; this one starts as a real visitor.
test.use({ storageState: { cookies: [], origins: [] } });

test("typing /demo opens the demo: sample agencies, a studio without sign-in, and a way out", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByTestId("demo-page")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByTestId("demo-banner")).toHaveCount(0);

  await page.getByTestId("demo-as-client").click();
  await expect(page).toHaveURL(/\/explore/);
  await expect(page.getByTestId("demo-banner")).toBeVisible();

  // Try the studio as a sample agency, without a password.
  await page.goto("/en/demo");
  await page.getByTestId("demo-as-nakhla.studio").click();
  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByTestId("demo-banner")).toBeVisible();

  // Leaving ends the demo view and the sample agency's session.
  await page.getByTestId("demo-banner").getByRole("button").click();
  await expect(page.getByTestId("demo-banner")).toHaveCount(0);
  await page.goto("/en/studio");
  await expect(page).toHaveURL(/\/en\/login$/);
});
