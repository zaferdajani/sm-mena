import { expect, test } from "@playwright/test";
import { joinAgency, login } from "./helpers";

// docs/61, report EABF5BB4: a provider who forgot the password gets a code and sets a new one.
test("a provider resets a forgotten password with an emailed code", async ({ browser }) => {
  const setup = await (await browser.newContext()).newPage();
  const account = await joinAgency(setup, "reset", { stay: true });
  await setup.context().close();

  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await page.goto("/ar/login");
  await page.getByTestId("forgot-link").click();
  await expect(page).toHaveURL(/\/ar\/forgot$/);

  // An unknown address gets the same answer as a real one.
  await page.fill("#email", `nobody-${Date.now()}@test.jo`);
  await page.getByTestId("forgot-email").getByRole("button").click();
  await expect(page.getByTestId("forgot-reset")).toBeVisible();
  await expect(page.getByTestId("forgot-shown-code")).toHaveCount(0);

  await page.goto("/ar/forgot");
  await page.fill("#email", account.email);
  await page.getByTestId("forgot-email").getByRole("button").click();
  const code = (await page.getByTestId("forgot-shown-code").locator("b").textContent())!.trim();
  await page.fill("#code", code);
  await page.fill("#password", "new-password-456");
  await page.fill("#confirm", "new-password-457");
  await page.getByTestId("forgot-reset").getByRole("button").click();
  await expect(page.getByTestId("forgot-reset")).toContainText("غير متطابقتين");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.fill("#code", code);
  await page.fill("#password", "new-password-456");
  await page.fill("#confirm", "new-password-456");
  await page.getByTestId("forgot-reset").getByRole("button").click();
  await page.waitForURL(/\/ar\/(studio|portfolio-setup)/);

  // The old password no longer works; the new one does.
  const again = await (await browser.newContext()).newPage();
  await again.goto("/en/login");
  await again.fill("#email", account.email);
  await again.fill("#password", account.password);
  await again.getByRole("button", { name: "Sign in" }).click();
  await expect(again.getByText("Wrong email or password.")).toBeVisible();
  await login(again, account.email, "new-password-456");
  await expect(again).not.toHaveURL(/\/login/);
});
