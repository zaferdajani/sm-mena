import { expect, test } from "@playwright/test";
import { currentStep, totpAt } from "../../lib/auth/totp";
import { ADMIN, joinAgency, login } from "./helpers";

test("an agency turns on two-factor sign-in and needs a code to sign in", async ({ page }) => {
  const account = await joinAgency(page, "mfa");
  await page.goto("/en/studio/security");
  await page.getByTestId("mfa-start").click();
  const secret = (await page.getByTestId("mfa-secret").textContent())!.trim();
  await page.fill("#code", "000000");
  await page.getByRole("button", { name: "Confirm and turn on" }).click();
  await expect(page.getByText("That code didn't work")).toBeVisible();
  // Previous step's code, so a fresh one is left for sign-in.
  await page.fill("#code", totpAt(secret, currentStep() - 1));
  await page.getByRole("button", { name: "Confirm and turn on" }).click();
  await expect(page.getByTestId("mfa-enabled")).toBeVisible();
  const backupCodes = (await page.getByTestId("backup-codes").locator("li").allTextContents()).map((c) => c.trim());
  expect(backupCodes).toHaveLength(10);

  // Sign out, then sign in: the password alone only reaches the code step.
  await page.context().clearCookies();
  await page.goto("/en/login");
  await page.fill("#email", account.email);
  await page.fill("#password", account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/login\/verify$/);
  await page.goto("/en/studio");
  await expect(page).toHaveURL(/\/en\/login$/); // no access while the code is owed
  await page.goto("/en/login/verify");
  await page.fill("#code", "123456");
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText("That code didn't work")).toBeVisible();
  await page.fill("#code", backupCodes[0]);
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/en\/studio$/);
  await page.goto("/en/studio/security");
  await expect(page.getByTestId("mfa-on")).toContainText("9 backup codes left");
});

test("an agency upgrades through the test checkout and admin sees the payment", async ({ page, browser }, info) => {
  // Paid plans are "coming soon": admin lets this agency try them as a pilot (Admin → Features).
  // One project only, since the pilot list is shared.
  test.skip(info.project.name === "mobile", "the pilot list is global; the desktop run covers it");
  const account = await joinAgency(page, "pay");
  await page.goto("/en/studio/billing");
  await expect(page.getByTestId("current-plan")).toHaveText("Free");
  await expect(page.getByRole("button", { name: "Choose Pro" })).toHaveCount(0);
  const admin = await browser.newPage();
  await login(admin, ADMIN.email, ADMIN.password);
  await admin.goto("/en/admin/features");
  const pilots = admin.getByTestId("feature-paid_plans-pilots");
  await pilots.fill(`${await pilots.inputValue()}, ${account.handle}`);
  await admin.getByTestId("feature-paid_plans-save").click();
  await expect(admin.getByTestId("feature-paid_plans").getByRole("status")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Choose Pro" }).click();
  await expect(page).toHaveURL(/\/en\/pay\//);
  await expect(page.getByTestId("pay-amount")).toContainText("19");
  await page.getByRole("button", { name: "Pay now (test)" }).click();
  await expect(page.getByTestId("paid-ok")).toBeVisible();
  await expect(page.getByTestId("current-plan")).toHaveText("Pro");
  await expect(page.getByTestId("billing-history")).toContainText("Paid");

  await admin.goto("/en/admin/payments");
  await expect(admin.getByTestId("payments-list")).toContainText(`Agency ${account.handle}`);
  const csv = await admin.request.get("/api/admin/payments");
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain(`Agency ${account.handle}`);
  // Not for anyone else.
  expect((await page.request.get("/api/admin/payments")).status()).toBe(403);
});

test("a visitor reports a problem and admin triages it", async ({ page, browser }, info) => {
  const message = `The quote button is broken ${info.project.name} ${Date.now()}`;
  await page.goto("/en/support?from=/en/match");
  await page.fill("#message", message);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByTestId("support-sent")).toBeVisible();

  const admin = await browser.newPage();
  await login(admin, ADMIN.email, ADMIN.password);
  await admin.goto("/en/admin/bugs?tab=reports");
  const row = admin.getByTestId("report-list").locator("li", { hasText: message });
  await expect(row).toContainText("/en/match");
  await row.getByRole("button", { name: "Done" }).click();
  await expect(admin.getByTestId("report-list").locator("li", { hasText: message })).toHaveCount(0);
});

test("admin console sections load", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/en/admin/stats?days=7");
  await expect(page.getByTestId("admin-stats-page")).toBeVisible();
  await expect(page.getByText("How far visitors get")).toBeVisible();
  await page.goto("/en/admin/bugs");
  await expect(page.getByText("Error journal")).toBeVisible();
  await page.goto("/en/admin/users?q=admin");
  await expect(page.getByTestId("admin-users")).toContainText(ADMIN.email);
  await page.goto("/en/admin/audit");
  await expect(page.getByTestId("audit-log")).toBeVisible();
  await page.goto("/en/admin/security");
  await expect(page.getByTestId("mfa-start")).toBeVisible();
  await page.goto("/en/admin");
  await expect(page.getByText("System")).toBeVisible();
});
