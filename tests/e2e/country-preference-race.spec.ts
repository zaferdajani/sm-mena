import { expect, test } from "@playwright/test";

type LocationHarness = Window & { __gpsCallbacks?: PositionCallback[]; __gpsErrors?: PositionErrorCallback[]; __gpsDelivered?: number };

function fakeLocation() {
  const w = window as LocationHarness;
  w.__gpsCallbacks = [];
  w.__gpsErrors = [];
  w.__gpsDelivered = 0;
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
    getCurrentPosition: (callback: PositionCallback, error?: PositionErrorCallback) => {
      w.__gpsCallbacks!.push(callback);
      if (error) w.__gpsErrors!.push(error);
    },
  } });
}

test("the site never asks for the location on its own", async ({ page }) => {
  await page.addInitScript(fakeLocation);
  await page.goto("/en/feed");
  await expect(page.locator('[data-testid="country-picker"]:visible select').first()).toBeEnabled();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as LocationHarness).__gpsCallbacks?.length ?? 0)).toBe(0);
});

test("a manual market choice survives a late location answer and synchronizes every mounted picker", async ({ page }) => {
  await page.addInitScript(fakeLocation);
  await page.goto("/en/feed");
  const locate = page.locator('[data-testid="country-locate"]:visible').first();
  test.skip((await locate.count()) === 0, "phones pick from the list; the locate button is in the desktop sidebar");
  await locate.click();
  await expect.poll(() => page.evaluate(() => (window as LocationHarness).__gpsCallbacks?.length ?? 0)).toBeGreaterThan(0);
  const picker = page.locator('[data-testid="country-picker"]:visible select').first();
  await expect(picker).toBeEnabled();
  await picker.selectOption("sa");
  await expect(picker).toHaveValue("sa");
  await expect(page.getByRole("navigation", { name: "Agencies" }).getByText("najd.creative")).toBeVisible();

  // Deliver the location only after the explicit Saudi choice: the choice wins.
  await page.evaluate(() => {
    const w = window as LocationHarness;
    for (const callback of w.__gpsCallbacks ?? []) {
      callback({ coords: { latitude: 31.9539, longitude: 35.9106, accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() } as GeolocationPosition);
      w.__gpsDelivered = (w.__gpsDelivered ?? 0) + 1;
    }
  });
  await expect.poll(() => page.evaluate(() => (window as LocationHarness).__gpsDelivered ?? 0)).toBeGreaterThan(0);
  await expect(picker).toHaveValue("sa");
  for (const mountedPicker of await page.getByTestId("country-picker").locator("select").all()) await expect(mountedPicker).toHaveValue("sa");
  await expect.poll(async () => (await page.context().cookies()).find((c) => c.name === "sw_country")?.value).toBe("sa");
  await page.reload();
  await expect(page.locator('[data-testid="country-picker"]:visible select').first()).toHaveValue("sa");
  await expect(page.getByRole("navigation", { name: "Agencies" }).getByText("najd.creative")).toBeVisible();
});

test("a refused location says so instead of doing nothing", async ({ page }) => {
  await page.addInitScript(fakeLocation);
  await page.goto("/en/feed");
  const locate = page.locator('[data-testid="country-locate"]:visible').first();
  test.skip((await locate.count()) === 0, "phones pick from the list; the locate button is in the desktop sidebar");
  await locate.click();
  await expect.poll(() => page.evaluate(() => (window as LocationHarness).__gpsErrors?.length ?? 0)).toBeGreaterThan(0);
  await page.evaluate(() => (window as LocationHarness).__gpsErrors!.forEach((e) => e({ code: 1, message: "denied", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError)));
  await expect(page.locator('[data-testid="country-locate-failed"]:visible')).toContainText("location");
});

test("an existing market selection is not replaced by first-visit detection", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "sw_country", value: "eg", url: baseURL! }]);
  await page.goto("/en/soon");
  await expect(page.getByTestId("country-picker").locator("select")).toHaveValue("eg");
  await expect(page.getByTestId("teaser-page")).toHaveAttribute("data-country", "eg");
  await page.getByTestId("locale-switcher").click();
  await expect(page).toHaveURL(/\/ar\/soon$/);
  await expect(page.getByTestId("country-picker").locator("select")).toHaveValue("eg");
  await expect(page.getByTestId("teaser-page")).toHaveAttribute("data-country", "eg");
});
