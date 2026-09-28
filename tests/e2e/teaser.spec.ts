import { expect, test } from "@playwright/test";
import { joinAgency, login } from "./helpers";

// The pre-launch teaser (docs/39-teaser.md): live counts per country and city,
// and every call to action opens /join.

test("the teaser shows every country and sends providers to /join", async ({ page }) => {
  await page.goto("/ar/soon");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByTestId("founder-benefits")).toBeVisible();
  await expect(page.getByTestId("founder-benefits")).toContainText("0%");
  await expect(page.getByTestId("teaser-whatsapp")).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByTestId("teaser-cta").first().click();
  await expect(page).toHaveURL(/\/ar\/join$/);
});

test("the teaser has an English version", async ({ page }) => {
  await page.goto("/en/soon");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Before the clients arrive");
});

test("a new provider gets a founding seat and a share card in the studio", async ({ page }) => {
  await joinAgency(page, "seat");
  await page.goto("/ar/studio");
  const card = page.getByTestId("founding-panel");
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("data-member", "true");
  // Every approved benefit renders (a missing message key would break the page).
  await expect(card.locator("li")).toHaveCount(7);
  await expect(card).toContainText("7%");
});

test("the teaser carries the moving hero, the vault and an account link", async ({ page }) => {
  await page.goto("/ar/soon");
  await expect(page.getByTestId("founder-benefits")).toBeVisible();

  await expect(page.getByTestId("teaser-account")).toHaveAttribute("href", "/ar/login");
  await expect(page.getByTestId("teaser-cta").first()).not.toContainText("#");
});

test("signed-in users can change their sign-in email and password", async ({ page }) => {
  const { password } = await joinAgency(page, "acct");
  await page.goto("/en/studio/security");
  const box = page.getByTestId("sign-in-details");
  await expect(box).toBeVisible();
  const newEmail = `moved-${Date.now()}@test.jo`;
  await page.fill("#new-email", newEmail);
  await page.fill("#email-password", password);
  await page.getByTestId("change-email").getByRole("button").click();
  await expect(page.getByTestId("change-email").getByRole("status")).toBeVisible();
  await page.fill("#old-password", password);
  await page.fill("#new-password", "brand-new-pass-1");
  await page.fill("#confirm-password", "brand-new-pass-1");
  await page.getByTestId("change-password").getByRole("button").click();
  await expect(page.getByTestId("change-password").getByRole("status")).toBeVisible();
  // Sign in again with the new details.
  await page.context().clearCookies({ name: "sw_session" });
  await login(page, newEmail, "brand-new-pass-1");
  await expect(page).toHaveURL(/studio/);
});
