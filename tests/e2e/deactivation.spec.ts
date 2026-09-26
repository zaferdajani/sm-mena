import { expect, test } from "@playwright/test";
import { joinAgency } from "./helpers";

// Any agency can close its account at any time (docs/32).
test("an agency closes its account: its page disappears and it can't sign in again", async ({ page }) => {
  const { handle, email, password } = await joinAgency(page, "closing");
  await page.goto("/en/studio/security");
  await page.getByTestId("close-account-open").click();
  await page.getByTestId("close-account-handle").fill("wrong.handle");
  await page.getByTestId("close-account-password").fill(password);
  await page.getByTestId("close-account-submit").click();
  await expect(page.getByTestId("close-account-error")).toContainText("doesn't match");

  await page.getByTestId("close-account-handle").fill(handle);
  await page.getByTestId("close-account-password").fill(password);
  await page.getByTestId("close-account-submit").click();
  await expect(page.getByTestId("account-closed")).toBeVisible();

  const res = await page.goto(`/en/a/${handle}`);
  expect(res?.status()).toBe(404);
  await page.goto("/en/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/login/);
});
