import { expect, test } from "@playwright/test";

test("like persists across reloads for the same browser", async ({ page }) => {
  await page.goto("/ar/a/zaytoon.brand");
  await page.getByTestId("post-grid").locator("a").first().click();
  await expect(page).toHaveURL(/\/ar\/p\//);
  const like = page.getByTestId("like-button");
  const pressed = await like.getAttribute("aria-pressed");
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", pressed === "true" ? "false" : "true");
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByTestId("like-button")).toHaveAttribute("aria-pressed", pressed === "true" ? "false" : "true");
});

test("saved posts and followed agencies appear on the saved page", async ({ page }) => {
  await page.goto("/en/a/aqaba.waves");
  await page.getByTestId("follow-button").click();
  await expect(page.getByTestId("follow-button")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("post-grid").locator("a").first().click();
  await page.getByTestId("save-button").click();
  await expect(page.getByTestId("save-button")).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(500);
  await page.goto("/en/saved");
  await expect(page.getByTestId("agency-row").filter({ hasText: "@aqaba.waves" })).toBeVisible();
  await expect(page.getByTestId("post-grid").locator("a")).toHaveCount(1);
});

test("explore filters by service and city through the filter sheet", async ({ page }) => {
  await page.goto("/en/explore");
  await page.getByTestId("filters-button").click();
  await page.locator('select[name="service"]').selectOption("ads_meta");
  await page.locator('select[name="city"]').selectOption("amman");
  await page.getByTestId("apply-filters").click();
  await expect(page).toHaveURL(/service=ads_meta/);
  await expect(page).toHaveURL(/city=amman/);
  await expect(page.getByTestId("post-grid").locator("a").first()).toBeVisible();
  await expect(page.getByTestId("hire-link")).toBeVisible();
});

test("Arabic search finds agencies regardless of letter variants", async ({ page }) => {
  await page.goto("/ar/explore?tab=agencies&q=" + encodeURIComponent("زيتون"));
  await expect(page.getByTestId("agency-row")).toHaveCount(1);
  await page.goto("/ar/explore?tab=agencies&q=" + encodeURIComponent("ساحل ميديا"));
  await expect(page.getByTestId("agency-row").first()).toContainText("@sahel.media");
});

test("a business can message an agency without an account", async ({ page }) => {
  await page.goto("/en/a/salt.stories");
  await page.getByTestId("message-button").click();
  await page.fill("#inq-name", "E2E Buyer");
  await page.fill("#inq-phone", "0791234567");
  await page.fill("#inq-message", "We need a monthly content plan for our NGO.");
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByTestId("inquiry-sent")).toBeVisible();
});

test("WhatsApp contact links carry a prefilled message", async ({ page }) => {
  await page.goto("/en/a/petra.growth");
  const href = await page.getByTestId("contact-whatsapp").first().getAttribute("href");
  expect(href).toMatch(/^https:\/\/wa\.me\/962\d+\?text=/);
});

test("explore takes several platforms, a budget range and full service", async ({ page }) => {
  await page.goto("/en/explore?tab=agencies");
  await page.getByTestId("filters-button").click();
  const options = page.getByTestId("platform-options");
  await options.getByRole("button", { name: "Instagram" }).click();
  await options.getByRole("button", { name: "TikTok" }).click();
  await expect(options.getByRole("button", { name: "Instagram" })).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("budget-min").fill("150");
  await page.getByTestId("budget-max").fill("600");
  await page.getByTestId("apply-filters").click();
  await expect(page).toHaveURL(/platforms=instagram%2Ctiktok|platforms=instagram,tiktok/);
  await expect(page).toHaveURL(/min=150/);
  await expect(page).toHaveURL(/max=600/);
  await expect(page.getByRole("button", { name: "150–600 JOD" })).toBeVisible();
  // Each platform is its own removable chip.
  await page.getByRole("button", { name: "TikTok", exact: true }).and(page.locator(":not([aria-pressed])")).click();
  await expect(page).toHaveURL(/platforms=instagram(&|$)/);
});
