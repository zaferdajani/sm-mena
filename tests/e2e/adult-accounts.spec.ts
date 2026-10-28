import { expect, test } from "@playwright/test";
import { nextJoinStep, uniqueHandle } from "./helpers";

// Accounts are for people of 18 or over, or of age where they live if higher
// (docs/08): every sign-up asks, the server refuses without it, the terms say
// so, and anyone can report a page that seems to belong to a minor.
test("sign-up needs the 18+ confirmation, on the page and on the server", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const handle = uniqueHandle("adult");
  await page.goto("/ar/join");
  await page.fill("#name", `Agency ${handle}`);
  await page.fill("#handle", handle);
  await nextJoinStep(page);
  await nextJoinStep(page);
  await page.fill("#whatsapp", "0791112233");
  await page.fill("#email", `${handle}@test.jo`);
  await page.fill("#password", "password-123");
  await page.check('input[name="consent"]');
  const adult = page.getByTestId("join-adult");
  await expect(page.locator("label", { has: adult })).toContainText("18");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  // The browser holds the form back...
  const submit = page.getByTestId("join-form").locator('button[type="submit"]');
  await submit.click();
  expect(await adult.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  await expect(page).toHaveURL(/\/ar\/join/);
  // ...and the server refuses it even when the browser check is bypassed.
  await adult.evaluate((el: HTMLInputElement) => el.removeAttribute("required"));
  await submit.click();
  await expect(page.getByText("حسابات سوّق لمن بلغوا 18 عاماً أو أكثر.")).toBeVisible();

  // A refused sign-up creates nothing; the happy path, box ticked, is join-steps.spec.ts. (The suite's
  // agency sign-ups also count against the 100 founding seats teaser.spec.ts expects to be open.)
  await expect(page).toHaveURL(/\/ar\/join/);
});

test("business-owner sign-in asks for the 18+ confirmation too", async ({ page }) => {
  await page.goto("/en/signin");
  await page.fill("#email", `adult-${Date.now()}@test.jo`);
  await page.check('input[name="consent"]');
  await page.getByTestId("signin-adult").evaluate((el: HTMLInputElement) => el.removeAttribute("required"));
  await page.getByRole("button", { name: "Send the code" }).click();
  await expect(page.getByText("Sawwiq accounts are for people aged 18 or older.")).toBeVisible();
  await expect(page.getByTestId("signin-shown-code")).toHaveCount(0);
});

test("the terms say who can have an account, and a page can be reported as run by a minor", async ({ page }) => {
  await page.goto("/ar/legal");
  await expect(page.getByRole("heading", { name: "من يحق له فتح حساب" })).toBeVisible();
  await expect(page.locator("article")).toContainText("18 عاماً أو أكثر");
  await page.goto("/en/explore");
  await page.locator('a[href*="/p/"]').first().click();
  await page.getByTestId("report-button").click();
  await expect(page.getByText("The person behind this page seems to be under 18")).toBeVisible();
});
