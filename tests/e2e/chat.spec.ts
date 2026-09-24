import { expect, test, type Page } from "@playwright/test";
import { ADMIN, login } from "./helpers";

// A seeded agency whose services include photography (lib/db/seed.ts).
const AGENCY = { email: "aqaba-waves@sawwiq.test", password: "demo-pass-123", handle: "aqaba.waves" };

const visibleBell = (page: Page) => page.locator('[data-testid="notification-bell"]:visible');

test("client and agency chat about a quote; the agency hears when the client accepts", async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  const tag = `${info.project.name}-${Date.now().toString(36)}`;
  const clientName = `Client ${tag}`;

  // 1. A client posts a request.
  await page.goto("/en/request/new?service=photography");
  await page.fill("#req-desc", `Product photos for a bakery (${tag})`);
  await page.fill("#req-name", clientName);
  await page.fill("#req-phone", "0790001133");
  await page.check('input[name="consent"]');
  await page.getByTestId("request-form").getByRole("button").last().click();
  await expect(page.getByTestId("request-created")).toBeVisible();
  const link = await page.getByTestId("request-link").innerText();
  await page.goto("/en/requests");
  const href = await page.locator('a[href*="/requests/"]').filter({ hasText: /Photography/ }).first().getAttribute("href");
  const requestId = href!.split("/requests/")[1];

  // 2. The agency quotes.
  const agency = await browser.newPage();
  await login(agency, AGENCY.email, AGENCY.password);
  await agency.goto(`/en/studio/opportunities/${requestId}`);
  await agency.fill("#p-timeline", "This week");
  await agency.fill("#p-message", "We shoot bakeries every month.");
  await agency.getByTestId("proposal-form").getByRole("button").click();
  await expect(agency.getByTestId("my-proposal")).toBeVisible();
  await expect(agency.getByTestId("message-client")).toBeVisible();

  // 3. The client opens the chat from the proposal card, sees the recording notice and writes.
  await page.goto(link);
  await page.getByTestId("proposal-chat").click();
  await expect(page).toHaveURL(new RegExp(`/chat/${AGENCY.handle.replace(".", "\\.")}$`));
  await expect(page.getByTestId("chat-notice")).toContainText("recorded");
  await expect(page.getByTestId("chat-notice")).toContainText("quality assurance");
  const question = `Can you shoot on Saturday? (${tag})`;
  await page.getByTestId("message-input").fill(question);
  await page.getByTestId("message-input").press("Enter");
  await expect(page.getByTestId("chat-message").filter({ hasText: question })).toBeVisible();
  await expect(page.getByTestId("message-input")).toHaveValue("");

  // 4. The agency sees the unread badge and the thread, and replies.
  await agency.goto("/en/studio/messages");
  await expect(agency.getByRole("link", { name: /Chats/ }).getByTestId("nav-badge")).toBeVisible();
  const row = agency.getByTestId("conversation").filter({ hasText: clientName });
  await expect(row).toHaveAttribute("data-unread", "true");
  await row.click();
  await expect(agency.getByTestId("chat-title")).toHaveText(clientName);
  await expect(agency.getByTestId("chat-notice")).toBeVisible();
  await expect(agency.getByTestId("chat-message").filter({ hasText: question })).toBeVisible();
  const answer = `Yes, Saturday at 10 works (${tag})`;
  await agency.getByTestId("message-input").fill(answer);
  await agency.getByTestId("message-send").click();
  await expect(agency.getByTestId("chat-message").filter({ hasText: answer })).toBeVisible();

  // 5. The client's open thread picks up the reply by polling, and shows the question as seen.
  await expect(page.getByTestId("chat-message").filter({ hasText: answer })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("chat-seen")).toBeVisible();

  // 6. The client accepts the quote; the agency is notified.
  await page.goto(link);
  page.on("dialog", (d) => d.accept());
  await page.getByTestId("accept").click();
  await expect(page.getByText("Closed")).toBeVisible();

  await agency.goto("/en/studio");
  await expect(visibleBell(agency).getByTestId("bell-count")).toBeVisible();
  await visibleBell(agency).click();
  await expect(agency).toHaveURL(/\/en\/studio\/notifications$/);
  await expect(agency.getByTestId("notification").filter({ hasText: `${clientName} accepted your quote` })).toBeVisible();
  await agency.close();

  // 7. Staff can read the transcript (read-only, audited).
  const admin = await browser.newPage();
  await login(admin, ADMIN.email, ADMIN.password);
  await admin.goto(`/en/admin/conversations?agency=${AGENCY.handle}`);
  await admin.getByTestId("admin-conversations").locator("a", { hasText: clientName }).click();
  await expect(admin.getByTestId("admin-transcript")).toContainText(question);
  await expect(admin.getByTestId("admin-transcript")).toContainText(answer);
  await admin.close();
});

test("the chat is readable in Arabic on a phone", async ({ page }) => {
  await page.goto("/ar/chats");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "محادثاتي" })).toBeVisible();
  await page.goto("/ar/notifications");
  await expect(page.getByRole("heading", { name: "الإشعارات" })).toBeVisible();
  await expect(visibleBell(page)).toBeVisible();
});
