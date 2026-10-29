import { expect, test, type Page } from "@playwright/test";
import { ADMIN, login } from "./helpers";

// docs/63: the reporter and support talk in one conversation; the reporter reviews the fix.
async function staffReply(admin: Page, marker: string, body: string, status: string) {
  await admin.goto("/en/admin/bugs?tab=reports&status=all");
  const row = admin.getByTestId("report-list").locator("li", { hasText: marker }).first();
  const form = row.getByTestId("report-reply");
  await form.locator("textarea").fill(body);
  await form.locator("select").selectOption(status);
  await form.getByRole("button", { name: "Send reply" }).click();
  await expect(row.getByTestId("report-thread")).toContainText(body);
}

test("report → support reply → still broken → fixed → the reporter confirms it works", async ({ page, browser }, info) => {
  test.skip(info.project.name !== "mobile", "the phone run covers the conversation");
  const marker = `محادثة ${Date.now()}`;
  await page.goto("/ar/support?from=/ar/studio");
  await page.fill("#message", `${marker}: زر الحفظ لا يستجيب`);
  await page.getByTestId("support-form").getByRole("button", { name: "إرسال" }).click();
  await page.getByTestId("support-thread-link").click();
  await expect(page.getByTestId("support-thread")).toHaveAttribute("data-status", "new");
  const threadUrl = page.url();

  const admin = await browser.newPage();
  await login(admin, ADMIN.email, ADMIN.password);
  await staffReply(admin, marker, "Thanks. Which phone are you using?", "waiting");

  // The red dot on Help and in "Your reports" until the conversation is opened.
  await page.goto("/ar/explore");
  await expect(page.getByTestId("help-unread")).toBeVisible();
  await page.goto("/ar/support");
  await expect(page.getByTestId("my-reports")).toContainText("ردّ جديد");
  await page.goto(threadUrl);
  await expect(page.getByTestId("thread-staff")).toContainText("Which phone");
  await expect(page.getByTestId("thread-status")).toContainText("بانتظار ردّك");
  await page.fill("#thread-message", "آيفون ١٥، متصفح سفاري");
  await page.getByTestId("thread-send").click();
  await expect(page.getByTestId("thread-sent")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("support-thread")).toHaveAttribute("data-status", "new");
  await expect(page.getByTestId("thread-reporter")).toContainText("آيفون");

  await staffReply(admin, marker, "Fixed for Safari. Open **New post** (/studio/new) and press Save again.", "done");
  await page.reload();
  await expect(page.getByTestId("thread-status")).toContainText("أُصلح");
  // A page address in a reply is a tappable link named after the page; Markdown marks are not shown.
  const link = page.getByTestId("thread-staff").last().getByTestId("reply-link");
  await expect(link).toHaveAttribute("href", "/ar/studio/new");
  await expect(link).toContainText("إضافة مشروع");
  await expect(page.getByTestId("thread-staff").last()).not.toContainText("**");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByTestId("thread-works").click();
  await expect(page.getByTestId("thread-confirmed")).toBeVisible();
  await expect(page.getByTestId("thread-reporter").last()).toContainText("أكّدتُ");

  await admin.goto("/en/admin/bugs?tab=reports&status=all");
  await expect(admin.getByTestId("report-list").locator("li", { hasText: marker }).first()).toContainText("The reporter confirmed the fix works");

  // The link is the permission: a made-up one shows nothing.
  await page.goto("/ar/support/t/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  await expect(page.getByTestId("thread-missing")).toBeVisible();
});
