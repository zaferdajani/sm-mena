import { expect, test } from "@playwright/test";

// The logo intro plays on phones, first visit of the session. Automated
// browsers skip it unless `?intro=1`, so the other specs never see it.
test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 390, height: 844 } });

test("the phone landing opens with the logo intro, then asks who you are", async ({ page }) => {
  await page.goto("/ar?intro=1");
  const intro = page.getByTestId("intro-sting");
  await expect(intro).toBeVisible();
  await expect(page.getByTestId("welcome-chooser")).toHaveCount(0);
  await page.getByTestId("intro-skip").click();
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
