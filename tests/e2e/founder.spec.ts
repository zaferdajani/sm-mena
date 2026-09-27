import { expect, test } from "@playwright/test";
import { joinAgency } from "./helpers";

// docs/45: Founder commercial perks are earned by useful supply, not by registering.
test("registration alone does not activate Founder perks; a real profile with a package does", async ({ page }) => {
  await joinAgency(page, "founder");

  await page.goto("/en/studio");
  const panel = page.getByTestId("founding-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("data-member", "true");
  const activation = page.getByTestId("founder-activation");
  await expect(activation).toHaveAttribute("data-eligible", "false");
  await expect(activation).toContainText("Registration alone is not enough");

  // A useful core profile: bio + a service.
  await page.goto("/en/studio/profile");
  await page.fill("#bio", "Content and ads for restaurants in Amman.");
  await page.getByTestId("service-search").fill("tiktok ads");
  await page.getByTestId("service-suggestion").first().click();
  await page.getByTestId("profile-form").locator('button[type="submit"]').click();
  await page.waitForURL(/\/studio\/(packages|profile)/);

  // Still not activated: no genuine work and no package yet.
  await page.goto("/en/studio");
  await expect(page.getByTestId("founder-activation")).toHaveAttribute("data-eligible", "false");

  // One useful package is proof enough.
  await page.goto("/en/studio/packages");
  const form = page.getByTestId("package-form").last();
  await form.locator('input[name="title"]').fill("Monthly content");
  await form.locator('select[name="service"]').selectOption({ index: 1 });
  await form.locator('input[name="priceJod"]').fill("300");
  await form.getByTestId("add-reels").click();
  await form.locator('input[name="deliveryDays"]').fill("30");
  await form.getByRole("button", { name: "Add package" }).click();
  await expect(page.getByTestId("package-contract")).toBeVisible();

  await page.goto("/en/studio");
  const ready = page.getByTestId("founder-activation");
  await expect(ready).toHaveAttribute("data-eligible", "true");
  await expect(ready).toContainText("activated");
});

test("an eligible Founder sees a new relevant brief at once; a registration-only newcomer does not", async ({ browser }, info) => {
  test.setTimeout(120_000);
  const tag = `${info.project.name}-${Date.now().toString(36)}`;

  // The founder: profile + package, offering TikTok ads.
  const founderPage = await browser.newPage();
  await joinAgency(founderPage, "fdr");
  await founderPage.goto("/en/studio/profile");
  await founderPage.fill("#bio", "TikTok ads for shops.");
  await founderPage.getByTestId("service-search").fill("tiktok ads");
  await founderPage.getByTestId("service-suggestion").first().click();
  await founderPage.getByTestId("profile-form").locator('button[type="submit"]').click();
  await founderPage.waitForURL(/\/studio\/(packages|profile)/);
  await founderPage.goto("/en/studio/packages");
  const form = founderPage.getByTestId("package-form").last();
  await form.locator('input[name="title"]').fill("TikTok starter");
  await form.locator('select[name="service"]').selectOption({ index: 1 });
  await form.locator('input[name="priceJod"]').fill("200");
  await form.getByTestId("add-reels").click();
  await form.locator('input[name="deliveryDays"]').fill("14");
  await form.getByRole("button", { name: "Add package" }).click();
  await expect(founderPage.getByTestId("package-contract")).toBeVisible();
  await founderPage.goto("/en/studio");
  await expect(founderPage.getByTestId("founder-activation")).toHaveAttribute("data-eligible", "true");

  // The newcomer: same service, but only a bio saved on the profile (no work, no package).
  const newcomerPage = await browser.newPage();
  await joinAgency(newcomerPage, "new");
  await newcomerPage.goto("/en/studio/profile");
  await newcomerPage.fill("#bio", "Just registered.");
  await newcomerPage.getByTestId("service-search").fill("tiktok ads");
  await newcomerPage.getByTestId("service-suggestion").first().click();
  await newcomerPage.getByTestId("profile-form").locator('button[type="submit"]').click();
  await newcomerPage.waitForURL(/\/studio\/(packages|profile)/);
  await newcomerPage.goto("/en/studio");
  await expect(newcomerPage.getByTestId("founder-activation")).toHaveAttribute("data-eligible", "false");

  // A real client (outside the demo view, so the brief reaches real providers) posts a TikTok ads brief.
  const baseURL = info.project.use.baseURL!;
  const client = await browser.newContext({ storageState: { cookies: [], origins: [{ origin: baseURL, localStorage: [{ name: "sw_role", value: "browse" }] }] } });
  const page = await client.newPage();
  await page.goto("/en/request/new?service=ads_tiktok");
  await page.fill("#req-desc", `TikTok ads for a dessert shop (${tag})`);
  await page.fill("#req-name", `Client ${tag}`);
  await page.fill("#req-phone", "0790001144");
  await page.check('input[name="consent"]');
  await page.getByTestId("request-form").getByRole("button").last().click();
  await expect(page.getByTestId("request-created")).toBeVisible();
  await client.close();

  await founderPage.goto("/en/studio/opportunities");
  await expect(founderPage.getByTestId("opportunities").locator("li", { hasText: tag })).toHaveCount(1);
  await newcomerPage.goto("/en/studio/opportunities");
  await expect(newcomerPage.getByTestId("opportunities").locator("li", { hasText: tag })).toHaveCount(0);
  await founderPage.close();
  await newcomerPage.close();
});
