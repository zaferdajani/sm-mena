import { expect, test } from "@playwright/test";

type LocationHarness = Window & { __gpsCallbacks?: PositionCallback[]; __gpsDelivered?: number };

test("a manual market choice survives late GPS and synchronizes every mounted picker", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as LocationHarness;
    w.__gpsCallbacks = [];
    w.__gpsDelivered = 0;
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
      getCurrentPosition: (callback: PositionCallback) => { w.__gpsCallbacks!.push(callback); },
    } });
  });
  await page.goto("/en/feed");
  await expect.poll(() => page.evaluate(() => (window as LocationHarness).__gpsCallbacks?.length ?? 0)).toBeGreaterThan(0);
  const picker = page.locator('[data-testid="country-picker"]:visible select').first();
  await expect(picker).toBeEnabled();
  await picker.selectOption("sa");
  await expect(picker).toHaveValue("sa");
  await expect(page.getByRole("navigation", { name: "Agencies" }).getByText("najd.creative")).toBeVisible();

  // Deliver the first-visit GPS result only after the explicit Saudi choice.
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
