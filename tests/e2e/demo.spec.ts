import { expect, test } from "@playwright/test";
import { joinAgency } from "./helpers";

test("typing /demo opens the demo: demo agencies only, no sign-in, and a way out", async ({ page, browser }) => {
  // A real agency, made in its own browser.
  const other = await browser.newContext();
  const { handle } = await joinAgency(await other.newPage(), "real");
  await other.close();

  await page.goto("/demo");
  await expect(page.getByTestId("demo-page")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByTestId("demo-banner")).toHaveCount(0);

  await page.getByTestId("demo-as-client").click();
  await expect(page.getByTestId("demo-banner")).toBeVisible();
  // Demo agencies are there; the real one is not, not even by its address.
  expect((await page.goto("/en/a/nakhla.studio"))?.status()).toBe(200);
  expect((await page.goto(`/en/a/${handle}`))?.status()).toBe(404);
  await page.goto(`/en/explore?q=${encodeURIComponent(`Agency ${handle}`)}`);
  await expect(page.getByText(`Agency ${handle}`)).toHaveCount(0);

  // Try the studio as a demo agency, without a password.
  await page.goto("/en/demo");
  await page.getByTestId("demo-as-nakhla.studio").click();
  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByTestId("demo-banner")).toBeVisible();

  // Leaving ends the demo and the demo agency's session.
  await page.getByTestId("demo-exit").click();
  await expect(page.getByTestId("demo-banner")).toHaveCount(0);
  await page.goto("/en/studio");
  await expect(page).toHaveURL(/\/en\/login$/);
  expect((await page.goto(`/en/a/${handle}`))?.status()).toBe(200);
});
