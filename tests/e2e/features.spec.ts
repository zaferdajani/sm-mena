import { expect, test } from "@playwright/test";
import { ADMIN, login } from "./helpers";

// Admin → Features (docs/34-feature-switches.md). The switches are global, so
// this suite only reads them and ticks the go-live checklist (the pilot flow is
// covered by the paid-plans test in admin-console.spec.ts).
test("admin sees every feature switch and the protected-payments go-live checklist", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "shared global state; the desktop run covers it");
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/en/admin/features");
  await expect(page.getByTestId("admin-features")).toBeVisible();
  for (const key of ["protected_payments", "paid_plans", "contracts", "ai_matchmaker", "quote_requests", "messaging", "partners", "demo_view"]) {
    await expect(page.getByTestId(`feature-${key}`)).toBeVisible();
  }
  // The e2e server starts with protected payments on (test mode); nothing is live.
  await expect(page.getByTestId("feature-protected_payments-on")).toBeChecked();
  await expect(page.getByTestId("golive-status")).toContainText("Not ready");

  const lawyer = page.getByTestId("golive-lawyerReviewed");
  const was = await lawyer.isChecked();
  await lawyer.click();
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(page.getByTestId("golive-lawyerReviewed")).toBeChecked({ checked: !was });
  await page.getByTestId("golive-lawyerReviewed").click(); // put it back
});

test("people who aren't staff can't open the switches", async ({ page }) => {
  const res = await page.goto("/en/admin/features");
  await expect(page).toHaveURL(/\/login/);
  expect(res?.ok()).toBe(true);
});
