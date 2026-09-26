import { expect, test } from "@playwright/test";

// The logo intro plays on phones, first visit of the session. Automated
// browsers skip it unless `?intro=1`, so the other specs never see it.
test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 390, height: 844 } });

test("the phone landing opens with the logo intro, then asks who you are", async ({ page }) => {
  await page.goto("/ar?intro=1");
  const intro = page.getByTestId("intro-sting");
  await expect(intro).toBeVisible();
  // While the intro plays the chooser waits. Checked in one step: on a slow
  // machine the intro may close itself (stalled video) at any moment.
  const waits = await page.evaluate(() => document.documentElement.dataset.intro !== "playing" || !document.querySelector('[data-testid="welcome-chooser"]'));
  expect(waits).toBe(true);
  if (await page.getByTestId("intro-skip").isVisible()) await page.getByTestId("intro-skip").click().catch(() => undefined);
  await expect(intro).toHaveCount(0);
  await expect(page.getByTestId("welcome-chooser")).toBeVisible();
});

test("the intro is skipped for automated visits, on desktop and for reduced motion", async ({ page }) => {
  await page.goto("/ar");
  await expect(page.getByTestId("intro-sting")).toBeHidden();
  await expect(page.getByTestId("welcome-chooser")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ar?intro=1");
  await expect(page.getByTestId("intro-sting")).toBeHidden();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/en?intro=1");
  await expect(page.getByTestId("intro-sting")).toBeHidden();
});
