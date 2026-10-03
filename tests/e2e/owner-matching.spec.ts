import { expect, test, type Page } from "@playwright/test";
import { ADMIN, joinAgency, login } from "./helpers";

// Owner ↔ provider matching end to end (docs/59), full phase: an owner registers a need, a provider in the
// same city with the needed service exists, staff compute and send, the owner accepts, the provider is told.

async function signInOwner(page: Page, email: string) {
  await page.goto("/en/owner");
  await page.fill("#email", email);
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Send the code" }).click();
  const code = (await page.getByTestId("signin-shown-code").locator("b").textContent())!.trim();
  await page.fill("#code", code);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("owner need → provider match → staff send → owner accepts → provider notified", async ({ browser }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  // 1. a provider in Amman offering social media management, with a published-work count via the profile
  const providerCtx = await browser.newContext();
  const provider = await providerCtx.newPage();
  const agency = await joinAgency(provider, "own");
  await provider.goto("/en/studio/profile?welcome=1");
  await provider.fill("#bio", "Social media for cafés and restaurants in Amman.");
  await provider.fill("#startingPriceJod", "200");
  await provider.getByTestId("service-search").fill("social media account");
  await provider.getByTestId("service-suggestion").first().click();
  await expect(provider.locator('input[name="services"][value="smm_management"]')).toHaveCount(1);
  await provider.getByTestId("profile-form").locator('button[type="submit"]').click();
  await expect(provider).toHaveURL(/\/en\/studio\/packages/);

  // 2. the owner registers a need for social media in Amman
  const ownerCtx = await browser.newContext();
  const owner = await ownerCtx.newPage();
  const ownerEmail = `owner-e2e-${stamp}@test.jo`;
  await signInOwner(owner, ownerEmail);
  await owner.waitForURL(/\/en\/(owner\/needs|saved)/);
  if (!/owner\/needs/.test(owner.url())) await owner.goto("/en/owner/needs");
  await owner.getByTestId("owner-services").locator("label", { hasText: "Social media" }).click();
  await owner.getByTestId("owner-save").click();
  await expect(owner).toHaveURL(/\/en\/owner\/done$/);

  // 3. staff compute and send (discovery is open in the full phase)
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, ADMIN.email, ADMIN.password);
  await admin.goto("/en/admin/owners");
  await expect(admin.getByTestId("admin-owners-page")).toBeVisible();
  await expect(admin.getByTestId("admin-owner-row").filter({ hasText: "ow…@test.jo" }).first()).toBeVisible();
  await admin.getByTestId("owners-compute").click();
  await expect(admin.getByTestId("owners-computed")).toBeVisible();
  await admin.getByTestId("owners-send").click();
  await expect(admin.getByTestId("owners-sent")).toContainText(/owners emailed/);

  // 4. the owner sees the match and accepts it
  await owner.goto("/en/owner/matches");
  const card = owner.getByTestId("owner-match").filter({ hasText: `Agency ${agency.handle}` });
  await expect(card).toHaveCount(1);
  await card.getByTestId("owner-match-accept").click();
  await expect(card.getByTestId("owner-match-introduced")).toBeVisible();

  // 5. the provider has the introduction in its notifications, with the city and the need
  await provider.goto("/en/studio/notifications");
  await expect(provider.locator("body")).toContainText(/business owner in amman asked to be introduced/i);
  await Promise.all([providerCtx.close(), ownerCtx.close(), adminCtx.close()]);
});
