import { expect, test, type Page } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

/** Hold media for deterministic gate/layout assertions, not autoplay validation. */
async function holdMedia(page: Page, naturalVisit = false) {
  await page.addInitScript((natural) => {
    if (natural) Object.defineProperty(navigator, "webdriver", { configurable: true, get: () => false });
    HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
    Object.defineProperty(HTMLMediaElement.prototype, "currentTime", { configurable: true, get: () => 1, set: () => undefined });
  }, naturalVisit);
}

for (const locale of ["ar", "en"]) {
  for (const width of [390, 1440]) {
    test(`${locale} intro is bounded and skippable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await holdMedia(page);
      await page.goto(`/${locale}?intro=1`);
      const intro = page.getByTestId("intro-sting");
      await expect(intro).toBeVisible();
      const metrics = await intro.locator("video").evaluate((video) => {
        const rect = video.getBoundingClientRect();
        return { fit: getComputedStyle(video).objectFit, width: rect.width, height: rect.height,
          contained: rect.x >= 0 && rect.y >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
          muted: (video as HTMLVideoElement).muted };
      });
      expect(metrics.fit).toBe("contain");
      expect(metrics.width).toBeLessThanOrEqual(448);
      expect(metrics.height).toBeLessThanOrEqual(576);
      expect(metrics.contained).toBe(true);
      expect(metrics.muted).toBe(true);
      await expect(page.getByTestId("welcome-chooser")).toBeHidden();
      await page.getByTestId("intro-skip").click();
      await expect(intro).toHaveCount(0);
      await expect(page.getByTestId("welcome-chooser")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.dataset.intro)).toBeUndefined();
    });
  }
}

test("fresh desktop visit starts without a logo click and respects session completion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await holdMedia(page, true);
  await page.goto("/en");
  await expect(page.getByTestId("intro-sting")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("intro-sting")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("intro-sting")).toBeHidden();
});

test("client navigation to the landing uses the same intro gate", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await holdMedia(page, true);
  await page.goto("/en/explore");
  await page.locator("aside a").first().click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByTestId("intro-sting")).toBeVisible();
  await page.getByTestId("intro-skip").click();
  await expect(page.getByTestId("intro-sting")).toHaveCount(0);
});

test("automation and reduced motion bypass the overlay", async ({ page }) => {
  await page.goto("/ar");
  await expect(page.getByTestId("intro-sting")).toBeHidden();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ar?intro=1");
  await expect(page.getByTestId("intro-sting")).toBeHidden();
  await expect(page.getByTestId("welcome-chooser")).toBeVisible();
});

test("blocked playback releases the landing and welcome chooser", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () { return Promise.reject(new Error("blocked playback fixture")); };
  });
  await page.goto("/en?intro=1");
  await expect(page.getByTestId("intro-sting")).toHaveCount(0);
  await expect(page.getByTestId("welcome-chooser")).toBeVisible();
  expect(await page.locator(".sw").evaluate((el) => (el as HTMLElement).inert)).toBe(false);
});
