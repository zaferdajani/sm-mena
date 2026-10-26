import { expect, test } from "@playwright/test";
import { ADMIN, login, pngBuffer } from "./helpers";

// docs/62: the help chat files a report into the queue the bug agent reads (docs/61).
test("the help chat answers a how-to question and files a bug report with a screenshot", async ({ page, browser }, info) => {
  test.skip(info.project.name !== "mobile", "one phone run covers the chat");
  const what = `القائمة السفلية لا تستجيب ${Date.now()}`;
  await page.goto("/ar/explore");
  await page.getByTestId("help-open").click();
  const chat = page.getByTestId("help-chat");
  await expect(chat).toHaveAttribute("data-mode", "guided");

  // How-to: answered from the help topics, with a link to the page.
  await chat.getByTestId("help-menu").getByRole("button", { name: "كيف أفعل…؟" }).click();
  await chat.getByTestId("help-input").fill("كيف أضيف مشروعاً؟");
  await chat.getByTestId("help-submit").click();
  await expect(chat.getByTestId("help-topics")).toContainText("إضافة مشروع");
  await chat.getByRole("button", { name: "نعم، شكراً" }).click();
  await chat.getByRole("button", { name: "هل من شيء آخر؟" }).click();

  // A bug: what, steps, skip expected, a screenshot, review, send.
  await chat.getByTestId("help-menu").getByRole("button", { name: "شيء لا يعمل" }).click();
  await chat.getByTestId("help-input").fill(what);
  await chat.getByTestId("help-submit").click();
  await chat.getByTestId("help-input").fill("فتحت صفحة الاستكشاف");
  await chat.getByTestId("help-submit").click();
  await chat.getByRole("button", { name: "تخطٍّ" }).click();
  await chat.getByTestId("help-shot-input").setInputFiles({ name: "shot.png", mimeType: "image/png", buffer: await pngBuffer("#225588", 390, 844) });
  await expect(chat.getByTestId("help-review")).toContainText(what);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await chat.getByTestId("help-send").click();
  await expect(chat).toContainText(/رقم بلاغك [A-F0-9]{8}/);
  const ref = (await chat.textContent())!.match(/رقم بلاغك ([A-F0-9]{8})/)![1];

  // Reopening shows the report and its status.
  await chat.getByTestId("help-close").click();
  await page.reload();
  await page.getByTestId("help-open").click();
  await expect(page.getByTestId("help-statuses")).toContainText(ref);
  await expect(page.getByTestId("help-statuses")).toContainText("وصل");

  // Staff see it with the page, the steps and the screenshot.
  const admin = await browser.newPage();
  await login(admin, ADMIN.email, ADMIN.password);
  await admin.goto("/en/admin/bugs?tab=reports");
  const row = admin.getByTestId("report-list").locator("li", { hasText: what });
  await expect(row.getByTestId("report-ref")).toHaveText(ref);
  await expect(row).toContainText("Steps: فتحت صفحة الاستكشاف");
  await expect(row).toContainText("/ar/explore");
  await expect(row.getByTestId("report-shots").locator("img")).toHaveCount(1);
});
