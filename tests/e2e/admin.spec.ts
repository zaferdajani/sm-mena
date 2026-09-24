import { expect, test } from "@playwright/test";
import { ADMIN, login } from "./helpers";

test.describe.configure({ mode: "serial" });

test("admin sees platform stats and monetization readiness", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/en\/admin$/);
  await expect(page.getByTestId("admin-stats")).toBeVisible();
  await expect(page.getByText("Revenue switch-on readiness")).toBeVisible();
});

test("admin verifies an agency and the badge appears publicly", async ({ page }, info) => {
  const handle = info.project.name === "mobile" ? "madaba.pixels" : "zarqa.digital";
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto(`/en/admin/agencies?q=${handle}`);
  const row = page.getByTestId("admin-agencies").locator("li", { hasText: `@${handle}` });
  await expect(row.getByTestId("verify-toggle")).toHaveText("Verify");
  await row.getByTestId("verify-toggle").click();
  await expect(row.getByTestId("verify-toggle")).toHaveText("Remove verification");
  await page.goto(`/en/a/${handle}`);
  await expect(page.locator('h1 + [aria-label="Verified"]')).toBeVisible();
});

test("a reported post can be hidden by admin", async ({ page, browser }, info) => {
  const handle = info.project.name === "mobile" ? "reel.house.jo" : "snap.souq";
  const visitor = await browser.newPage();
  await visitor.goto(`/en/a/${handle}`);
  await visitor.getByTestId("post-grid").locator("a").first().click();
  await visitor.waitForURL(/\/en\/p\//);
  const postUrl = visitor.url();
  await visitor.getByTestId("report-button").click();
  await visitor.getByRole("button", { name: "Send report" }).click();
  await expect(visitor.getByText("Thanks. We will review it.")).toBeVisible();

  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/en/admin/reports");
  const report = page.getByTestId("admin-reports").locator("li", { hasText: `@${handle}` });
  await report.getByRole("button", { name: "Hide post" }).click();
  await expect(report).toHaveCount(0);
  await expect.poll(async () => (await visitor.request.get(postUrl)).status(), { timeout: 15_000 }).toBe(404);
  await visitor.close();
});

test("admin creates a strip promotion and it shows as sponsored", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/en/admin/promotions");
  await page.fill("#handle", "@linked.levant");
  await page.selectOption("#placement", "strip");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByTestId("admin-promotions")).toContainText("@linked.levant");
  await page.goto("/en/feed");
  await expect(page.getByRole("navigation", { name: "Agencies" }).getByText("Sponsored")).toBeVisible();
});
