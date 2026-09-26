import { expect, test } from "@playwright/test";
import { joinAgency, pngBuffer } from "./helpers";

// Apps in a portfolio (docs/37): the post carries the app; "Try the app" frames the app mall's sandbox.
test("an agency posts an app and visitors can try it in the sandbox frame", async ({ page }) => {
  await joinAgency(page, "apps");
  await page.goto("/en/studio/new");
  await page.getByTestId("image-input").setInputFiles({ name: "app.png", mimeType: "image/png", buffer: await pngBuffer("#1d4ed8", 900, 1600) });
  await page.fill("#caption", "Ordering app for a café");
  await page.locator('input[name="services"][value="app_development"]').check({ force: true });
  await page.getByTestId("app-section").locator("summary").click();
  await page.fill("#app_name", "Rose Orders");
  await page.selectOption("#app_kind", "cross");
  await page.fill("#app_version", "2.1");
  // A link outside the app mall is refused.
  await page.fill("#app_try", "https://evil.example/frame");
  await page.getByTestId("publish-button").click();
  await expect(page.getByTestId("post-form").getByRole("alert")).toContainText("app-mall embed link");
  await page.fill("#app_try", "https://pcn.store/embed/testkey123/");
  await page.fill("#app_store", "https://apps.apple.com/app/id123");
  await page.getByTestId("publish-button").click();
  await expect(page).toHaveURL(/\/en\/p\//, { timeout: 30_000 });

  const panel = page.getByTestId("post-app").last();
  await expect(panel).toContainText("Rose Orders");
  await expect(panel).toContainText("v2.1");
  await expect(panel.getByTestId("app-store-link")).toHaveAttribute("href", "https://apps.apple.com/app/id123");
  await panel.getByTestId("try-app").click();
  const frame = page.getByTestId("try-app-frame");
  await expect(frame).toBeVisible();
  await expect(frame.locator("iframe")).toHaveAttribute("src", "https://pcn.store/embed/testkey123/");
  await expect(frame.locator("iframe")).toHaveAttribute("sandbox", /allow-scripts/);
  await frame.getByRole("button", { name: "Close" }).click();
  await expect(frame).toHaveCount(0);
});

test("the app development hire page exists in both languages", async ({ page }) => {
  await page.goto("/en/hire/app_development");
  await expect(page.locator("h1")).toContainText(/app development/i);
  await page.goto("/ar/hire/app_development");
  await expect(page.locator("h1")).toContainText("تطبيقات");
});
