import { expect, test } from "@playwright/test";
import { uniqueHandle } from "./helpers";

// First-time visitors are asked who they are; returning ones aren't.
test.use({ storageState: { cookies: [], origins: [] } });

test("a business is sent to the guided matcher, and not asked again", async ({ page }) => {
  await page.goto("/ar");
  const dialog = page.getByTestId("welcome-chooser");
  await expect(dialog).toBeVisible();
  await dialog.getByTestId("welcome-client").click();
  await expect(page).toHaveURL(/\/ar\/match$/);
  await page.goto("/ar");
  await expect(page.locator("main")).toBeVisible();
  await expect(page.getByTestId("welcome-chooser")).toHaveCount(0);
});

test("an agency signs up with what it offers", async ({ page }) => {
  await page.goto("/en");
  await page.getByTestId("welcome-agency").click();
  await expect(page).toHaveURL(/\/en\/join$/);
  const handle = uniqueHandle("welcome");
  await page.fill("#name", `Agency ${handle}`);
  await page.fill("#handle", handle);
  await page.getByText("SEO", { exact: true }).click();
  await page.fill("#whatsapp", "0791112233");
  await page.fill("#email", `${handle}@test.jo`);
  await page.fill("#password", "password-123");
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Create page" }).click();
  await page.waitForURL(/\/en\/studio\/profile/);
  await page.goto(`/en/a/${handle}?tab=about`);
  await expect(page.locator("dl").last()).toContainText("SEO");
});

test("just browsing closes the question", async ({ page }) => {
  await page.goto("/en");
  await page.getByTestId("welcome-browse").click();
  await expect(page.getByTestId("welcome-chooser")).toHaveCount(0);
});
