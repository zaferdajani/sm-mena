import { expect, test } from "@playwright/test";
import { ADMIN, login } from "./helpers";

test("the owner invites a support member who sees only support tools", async ({ page, browser }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/en/admin/team");
  await expect(page.getByTestId("staff-role")).toHaveText("Owner");
  const email = `support.${Date.now().toString(36)}@test.jo`;
  await page.getByTestId("invite-email").fill(email);
  await page.getByTestId("invite-role").selectOption("support");
  await page.getByRole("button", { name: "Create invitation link" }).click();
  const link = (await page.getByTestId("staff-invite-link").textContent())!.trim();
  expect(link).toContain("/en/join/staff/");

  const ctx = await browser.newContext();
  const staff = await ctx.newPage();
  await staff.goto(link);
  await expect(staff.getByRole("heading", { name: "Join the Sawwiq team as Support" })).toBeVisible();
  await staff.fill("#password", "support-pass-123");
  await staff.fill("#confirm", "support-pass-123");
  await staff.getByRole("button", { name: "Create my account" }).click();
  await staff.waitForURL(/\/en\/admin\/security$/);

  await staff.goto("/en/admin");
  await expect(staff.getByTestId("staff-role")).toHaveText("Support");
  await expect(staff.getByTestId("admin-stats")).toHaveCount(0); // no platform numbers
  const nav = staff.locator("nav").filter({ hasText: "Platform" });
  await expect(nav.getByRole("link", { name: "Payments" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Team" })).toHaveCount(0);

  // Pages outside the role send them back to the dashboard, and the export refuses.
  for (const path of ["/en/admin/payments", "/en/admin/team", "/en/admin/audit"]) {
    await staff.goto(path);
    await expect(staff).toHaveURL(/\/en\/admin$/);
  }
  expect((await staff.request.get("/api/admin/payments")).status()).toBe(403);
  await staff.goto("/en/admin/bugs");
  await expect(staff.getByTestId("report-list")).toBeAttached(); // user reports tab (may be empty)
  await expect(staff.getByTestId("error-list")).toHaveCount(0);

  // The link works once.
  const again = await (await browser.newContext()).newPage();
  await again.goto(link);
  await expect(again.getByRole("heading", { name: "This invitation can't be used" })).toBeVisible();

  // The owner switches the account off: the session ends at once.
  await page.reload();
  const row = page.getByTestId("staff-list").locator("li", { hasText: email });
  await row.getByRole("button", { name: "Switch off" }).click();
  await expect(row.getByText("Switched off")).toBeVisible();
  await staff.goto("/en/admin");
  await expect(staff).toHaveURL(/\/en\/login$/);
  await ctx.close();
});
