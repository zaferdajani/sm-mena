import { expect, test } from "@playwright/test";

// New visitors find sign-up from the landing header, the app header and the
// login page, and pick provider or business on one page (/start).

test("a new visitor finds Join on the landing page and picks provider or business", async ({ page }) => {
  await page.goto("/ar");
  const join = page.getByTestId("landing-join");
  await expect(join).toBeVisible();
  await expect(join).toHaveAttribute("href", "/ar/start");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);

  await page.goto("/ar/start");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("انضم إلى سوّق");
  await expect(page.getByTestId("start-provider")).toHaveAttribute("href", "/ar/join");
  await expect(page.getByTestId("start-client")).toHaveAttribute("href", "/ar/signin");
  await expect(page.getByTestId("start-login")).toHaveAttribute("href", "/ar/login");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);

  await page.getByTestId("start-provider").click();
  await expect(page).toHaveURL(/\/ar\/join$/);
});

test("the login page sends new visitors to the same choice", async ({ page }) => {
  await page.goto("/en/login");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
  await page.getByTestId("login-join").click();
  await expect(page).toHaveURL(/\/en\/start$/);
  await page.getByTestId("start-client").click();
  await expect(page).toHaveURL(/\/en\/signin$/);
});

test("the app header shows Join to signed-out visitors on a phone", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "the compact header is the phone layout");
  await page.goto("/ar/explore");
  await expect(page.getByTestId("header-join")).toBeVisible();
  await expect(page.getByTestId("header-join")).toHaveAttribute("href", "/ar/start");
});

test("the landing header fits a 320 px phone with Join showing", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/en");
  await expect(page.getByTestId("landing-join")).toBeVisible();
  await expect(page.getByTestId("landing-join")).toContainText("Join");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  // Join and Sign in are both fully on screen (the header clips, so check the boxes).
  for (const id of ["landing-join", "landing-account"]) {
    const box = (await page.getByTestId(id).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
  }
});
