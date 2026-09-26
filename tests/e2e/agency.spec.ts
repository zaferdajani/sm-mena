import { expect, test } from "@playwright/test";
import { pngBuffer, uniqueHandle } from "./helpers";

test("an agency joins, completes its page, publishes and deletes a post", async ({ page }) => {
  const handle = uniqueHandle();
  await page.goto("/en/join");
  await page.fill("#name", "E2E Agency");
  await page.fill("#handle", handle);
  await page.fill("#whatsapp", "0791112233");
  await page.fill("#email", `${handle}@test.jo`);
  await page.fill("#password", "password-123");
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Create page" }).click();
  await expect(page).toHaveURL(/\/en\/studio\/profile\?welcome=1/);

  await page.fill("#bio", "Testing the platform end to end.");
  await page.fill("#startingPriceJod", "250");
  // Services are tags: type part of the name and pick the suggestion.
  await page.getByTestId("service-search").fill("tiktok ads");
  await page.getByTestId("service-suggestion").first().click();
  await expect(page.locator('input[name="services"][value="ads_tiktok"]')).toHaveCount(1);
  await page.getByTestId("profile-form").locator('button[type="submit"]').click();
  // A new agency's first save moves on to the next setup step: its packages.
  await expect(page).toHaveURL(/\/en\/studio\/packages\?welcome=1/);
  await expect(page.getByTestId("packages-welcome")).toContainText("Page saved.");
  await page.goto("/en/studio");
  await expect(page.getByTestId("setup-profile")).toHaveAttribute("data-done", "true");
  await expect(page.getByTestId("setup-packages")).toHaveAttribute("data-done", "false");

  await page.goto("/en/studio/new");
  await page.getByTestId("image-input").setInputFiles([
    { name: "one.png", mimeType: "image/png", buffer: await pngBuffer("#be123c", 1200, 1500) },
    { name: "two.png", mimeType: "image/png", buffer: await pngBuffer("#1d4ed8") },
  ]);
  await page.fill("#caption", "E2E campaign for a local café");
  await page.fill("#result", "+60% reach");
  await page.getByTestId("publish-button").click();
  await expect(page).toHaveURL(/\/en\/p\//, { timeout: 30_000 });
  await expect(page.getByTestId("post-card")).toContainText("E2E campaign");
  await expect(page.getByTestId("post-card").locator("img")).toHaveCount(2); // new agency avatar is initials, so only the two images

  await page.goto(`/en/a/${handle}`);
  await expect(page.getByTestId("post-count")).toHaveText("1");

  await page.goto("/en/studio/posts");
  await page.locator('a[href*="/studio/posts/"]').first().click();
  page.on("dialog", (d) => d.accept());
  await page.getByTestId("delete-post").click();
  await expect(page).toHaveURL(/\/en\/studio\/posts$/);
  await expect(page.getByText("You haven't posted any work yet.")).toBeVisible();
});

test("studio requires sign-in", async ({ page }) => {
  await page.goto("/en/studio");
  await expect(page).toHaveURL(/\/en\/login$/);
});

test("wrong password is rejected", async ({ page }) => {
  await page.goto("/en/login");
  await page.fill("#email", "nakhla-studio@sawwiq.test");
  await page.fill("#password", "not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Wrong email or password" })).toBeVisible();
});

test("the demo agency sees insights and its inbox", async ({ page }) => {
  await page.goto("/en/login");
  await page.fill("#email", "petra-growth@sawwiq.test");
  await page.fill("#password", "demo-pass-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/studio$/);
  await expect(page.getByTestId("insight-tiles")).toBeVisible();
  await page.goto("/en/studio/inbox");
  await expect(page.getByTestId("inbox").locator("li").first()).toContainText("Desert Threads");
});
