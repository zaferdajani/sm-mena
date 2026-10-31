import { expect, test } from "@playwright/test";
import { ADMIN, joinAgency, login, pngBuffer } from "./helpers";

// docs/61: a complaint with a screenshot, sent from an Arabic phone, reaches Admin → Bugs
// with its report number, page and screen size; the screenshot is private to staff.
test("a complaint with a screenshot reaches Admin → Bugs, screenshot private", async ({ page, browser }, info) => {
  test.skip(info.project.name !== "mobile", "the phone run covers the form; admin is checked on the same report");
  const message = `زر الحفظ لا يستجيب ${Date.now()}`;
  await page.goto("/ar/support?from=/ar/studio&kind=complaint");
  await expect(page.locator('input[name="kind"][value="complaint"]')).toBeChecked();
  await page.fill("#message", message);
  await page.getByTestId("support-shot-input").setInputFiles({ name: "shot.png", mimeType: "image/png", buffer: await pngBuffer("#cc3344", 390, 844) });
  await expect(page.getByTestId("support-shots").locator("li")).toHaveCount(1);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByTestId("support-form").getByRole("button", { name: "إرسال" }).click();
  await expect(page.getByTestId("support-sent")).toBeVisible();
  const ref = (await page.getByTestId("support-ref").textContent())!.trim();
  expect(ref).toMatch(/^[A-F0-9]{8}$/);

  const admin = await browser.newPage();
  await login(admin, ADMIN.email, ADMIN.password);
  await admin.goto("/en/admin/bugs?tab=reports");
  const row = admin.getByTestId("report-list").locator("li", { hasText: message });
  await expect(row.getByTestId("report-ref")).toHaveText(ref);
  await expect(row).toContainText("A complaint");
  await expect(row).toContainText("/ar/studio");
  await expect(row).toContainText(/\d+x\d+/);
  const shot = row.getByTestId("report-shots").locator("img");
  await expect(shot).toHaveCount(1);
  await expect.poll(() => shot.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

  // Not for anyone else.
  const src = (await shot.getAttribute("src"))!;
  const visitor = await browser.newContext();
  expect((await visitor.request.get(src)).status()).toBe(404);
  await visitor.close();
});

// docs/63: the reporter hears about the report in their notification centre too, never with the report text.
test("a signed-in agency's report shows up in its Studio notifications", async ({ page }) => {
  await joinAgency(page, "notice");
  const message = `البحث لا يعمل ${Date.now()}`;
  await page.goto("/ar/support?from=/ar/studio");
  await page.fill("#message", message);
  await page.getByTestId("support-form").getByRole("button", { name: "إرسال" }).click();
  await expect(page.getByTestId("support-sent")).toBeVisible();
  const ref = (await page.getByTestId("support-ref").textContent())!.trim();
  await page.goto("/ar/studio/notifications");
  const notice = page.locator('[data-testid="notification"][data-kind="support_received"]').first();
  await expect(notice).toBeVisible();
  await expect(notice).toContainText(ref);
  await expect(notice).not.toContainText("البحث لا يعمل");
  await expect(notice).toHaveAttribute("href", /\/ar\/support\/t\//);
});
