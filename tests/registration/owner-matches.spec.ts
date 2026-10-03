import { expect, test, type Page } from "@playwright/test";

// Owner matches during the registration phase (docs/59): the page exists, explains that providers are still
// building their pages, shows nothing that was not sent, and is only for signed-in owners.

async function signInOwner(page: Page, email: string) {
  await page.goto("/en/owner");
  await page.fill("#email", email);
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Send the code" }).click();
  const code = (await page.getByTestId("signin-shown-code").locator("b").textContent())!.trim();
  await page.fill("#code", code);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/owner\/needs$/);
}

test("an owner sees the closed-phase explanation on the matches page and no suggestions", async ({ page }) => {
  await signInOwner(page, `owner-matches-${Date.now()}@test.jo`);
  await page.getByTestId("owner-services").locator("label").first().click();
  await page.getByTestId("owner-save").click();
  await expect(page).toHaveURL(/\/en\/owner\/done$/);
  await page.getByTestId("owner-to-matches").click();
  await expect(page).toHaveURL(/\/en\/owner\/matches$/);
  await expect(page.getByTestId("owner-matches-empty")).toContainText("still building their pages");
  await expect(page.getByTestId("owner-match")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});

test("the matches page redirects anonymous visitors to the owner door", async ({ page }) => {
  await page.goto("/ar/owner/matches");
  await expect(page).toHaveURL(/\/ar\/owner$/);
});
