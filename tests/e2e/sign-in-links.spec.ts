import { expect, test } from "@playwright/test";
import { DEMO_AGENCY, login } from "./helpers";

test("the front page and the app offer sign-in, then the studio once signed in", async ({ page }) => {
  await page.goto("/ar");
  const account = page.getByTestId("landing-account");
  await expect(account).toHaveAttribute("href", "/ar/login");
  await page.goto("/en/feed");
  // The app's sign-in opens the chooser (clients by email code, providers by password), which links to the provider sign-in.
  const signIn = page.locator('a[href="/en/signin"]:visible').first();
  await expect(signIn).toBeVisible();
  await signIn.click();
  await expect(page.locator('a[href^="/en/login"]').first()).toBeVisible();
  await login(page, DEMO_AGENCY.email, DEMO_AGENCY.password);
  await page.goto("/en");
  await expect(page.getByTestId("landing-account")).toHaveAttribute("href", "/en/studio");
  await expect(page.getByTestId("landing-account")).toContainText("Studio");
});
