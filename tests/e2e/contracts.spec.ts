import { expect, test, type Page } from "@playwright/test";
import { ADMIN, joinAgency, login } from "./helpers";

async function tickAll(page: Page) {
  const milestone = page.getByTestId("milestone").first();
  const boxes = milestone.getByTestId("checklist").locator('input[type="checkbox"]');
  const n = await boxes.count();
  for (let i = 0; i < n; i++) {
    await boxes.nth(i).check();
    await expect(boxes.nth(i)).toBeChecked();
  }
  // let the last server action settle
  await page.waitForLoadState("networkidle");
}

test("protected contract: sign, pay in, deliver, confirm and release", async ({ page, browser }) => {
  const account = await joinAgency(page, "deal");

  // A package with structured contents shows on the public profile.
  await page.goto("/en/studio/packages");
  const form = page.getByTestId("package-form").last();
  await form.locator('input[name="title"]').fill("Instagram Growth");
  await form.locator('select[name="service"]').selectOption({ index: 1 });
  await form.locator('input[name="priceJod"]').fill("300");
  await form.getByTestId("add-reels").click();
  await form.getByRole("tab", { name: "Accounts handled" }).click();
  await form.getByTestId("add-account_management").click();
  await form.locator('input[name="deliveryDays"]').fill("30");
  await form.getByRole("button", { name: "Add package" }).click();
  await expect(page.getByTestId("package-contract")).toBeVisible();
  await page.goto(`/en/a/${account.handle}?tab=about`);
  await expect(page.getByTestId("package-items")).toContainText("Reels / short videos (Instagram)");

  // Contract from the package.
  await page.goto("/en/studio/packages");
  await page.getByTestId("package-contract").first().click();
  await expect(page.getByTestId("contract-builder")).toBeVisible();
  await expect(page.locator("#c-title")).toHaveValue("Instagram Growth");
  await page.fill("#c-name", "Nour Café");
  await page.fill("#c-phone", "0790000001");
  await page.getByTestId("split-2").click();
  await expect(page.getByTestId("milestone-row")).toHaveCount(2);
  await expect(page.getByTestId("contract-total")).toContainText("300");
  await page.getByRole("button", { name: "Add request" }).click();
  await page.getByLabel("Request").fill("Owner approves captions before posting");
  await page.getByTestId("nda-toggle").check();
  await page.fill("#c-signer", "Sara Haddad");
  await page.getByText(/I agree to this contract on behalf of/).click();
  await page.getByRole("button", { name: "Sign and send to client" }).click();
  await expect(page).toHaveURL(/\/en\/studio\/contracts\/[0-9a-f-]+\?sent=1/);
  await expect(page.getByTestId("contract-status")).toHaveText("Waiting for client signature");
  const clientUrl = (await page.getByTestId("client-link").textContent())!.trim();
  const agencyContractUrl = page.url().split("?")[0];

  // Client: read, sign, pay the first milestone into protection.
  const client = await browser.newPage();
  await client.goto(clientUrl);
  await expect(client.getByTestId("contract-document")).toContainText("Confidentiality (NDA)");
  await expect(client.getByTestId("contract-document")).toContainText("★ Owner approves captions before posting");
  await client.fill("#signer", "Nour Khalil");
  await client.getByText("I have read and agree to this contract.").click();
  await client.getByRole("button", { name: "Sign contract" }).click();
  await expect(client.getByTestId("contract-status")).toHaveText("Active");
  await client.getByRole("button", { name: /Pay 150 JOD into protection/ }).click();
  await expect(client.getByTestId("fund-amount")).toContainText("150");
  await client.getByRole("button", { name: "Pay now (test)" }).click();
  await expect(client.getByTestId("funded-ok")).toBeVisible();
  await expect(client.getByTestId("money-held")).toContainText("150");

  // Agency: tick the checklist and deliver.
  await page.goto(agencyContractUrl);
  await expect(page.getByTestId("milestone").first()).toHaveAttribute("data-status", "funded");
  await tickAll(page);
  await page.getByTestId("milestone").first().locator('textarea[name="note"]').fill("Reels live on the café's Instagram");
  await page.getByRole("button", { name: "Send for approval" }).click();
  await expect(page.getByTestId("milestone").first()).toHaveAttribute("data-status", "submitted");

  // Client: confirm every item (including the special request), approve, money released.
  await client.reload();
  await expect(client.getByTestId("milestone").first()).toContainText("Reels live on the café's Instagram");
  await client.getByRole("button", { name: /Approve and release/ }).click();
  await expect(client.getByText("Every checklist item must be ticked first.")).toBeVisible();
  await tickAll(client);
  await client.getByRole("button", { name: /Approve and release 150 JOD/ }).click();
  await expect(client.getByTestId("milestone").first()).toHaveAttribute("data-status", "released");
  await expect(client.getByTestId("money-held")).toContainText("0");
  await expect(client.getByRole("button", { name: /Pay 150 JOD into protection/ })).toBeVisible(); // next milestone

  // Admin sees the protected money.
  const admin = await browser.newPage();
  await login(admin, ADMIN.email, ADMIN.password);
  await admin.goto("/en/admin/payments?tab=protected");
  await expect(admin.getByTestId("escrow-overview")).toContainText("Paid out to agencies");
});

test("protections: targets and reporting, extra money only by the client's approval, progress updates", async ({ page, browser }) => {
  await joinAgency(page, "grow");
  await page.goto("/en/studio/contracts/new");
  await page.fill("#c-name", "Omar Khalil");
  await page.fill("#c-phone", "0790000009");
  await page.fill("#c-title", "Growth for Accrues and Nashmi");
  await page.fill("#c-total", "900");
  await page.getByTestId("split-1").click();
  await page.getByTestId("milestone-row").locator("textarea").fill("Brand guidelines\nChannel plan and budget split");
  await page.getByTestId("add-kpi").click();
  await page.getByLabel("Target", { exact: true }).fill("B2B leads per month");
  await page.getByLabel("Number").fill("60");
  await page.getByTestId("cadence").selectOption("weekly");
  await page.getByRole("radio", { name: /Direct between you and the client/ }).check({ force: true });
  await page.fill("#c-signer", "Lina Growth");
  await page.getByText(/I agree to this contract on behalf of/).click();
  await page.getByRole("button", { name: "Sign and send to client" }).click();
  await expect(page).toHaveURL(/\/en\/studio\/contracts\/[0-9a-f-]+\?sent=1/);
  const clientUrl = (await page.getByTestId("client-link").textContent())!.trim();
  const agencyUrl = page.url().split("?")[0];

  const client = await browser.newPage();
  await client.goto(clientUrl);
  const doc = client.getByTestId("contract-document");
  await expect(doc).toContainText("B2B leads per month: 60");
  await expect(doc).toContainText("Ownership of accounts and files");
  await expect(doc).toContainText("No surprise charges");
  await client.fill("#signer", "Omar Khalil");
  await client.getByText("I have read and agree to this contract.").click();
  await client.getByRole("button", { name: "Sign contract" }).click();
  await expect(client.getByTestId("commitments")).toContainText("Weekly report");

  // The agency can only ask for more; the contract total doesn't move until the client accepts.
  await page.goto(agencyUrl);
  await page.getByText("Ask for extra work or money").click();
  await page.fill('input[name="title"]', "Neo launch campaign");
  await page.fill('textarea[name="reason"]', "The online store opens earlier than planned");
  await page.fill('input[name="amount"]', "300");
  await page.fill('input[name="dueDate"]', "2030-01-15");
  await page.fill('textarea[name="checks"]', "Launch creatives\nLaunch ads setup");
  await page.getByRole("button", { name: "Send to the client" }).click();
  await expect(page.getByTestId("change-pending")).toContainText("Neo launch campaign");
  await page.getByLabel("Post an update for the client").fill("Week 1: brand guidelines drafted, pixel installed, 14 leads so far.");
  await page.getByRole("button", { name: "Post update" }).click();
  await expect(page.getByTestId("updates")).toContainText("14 leads so far");

  await client.reload();
  await expect(client.getByTestId("updates")).toContainText("14 leads so far");
  const pending = client.getByTestId("change-pending");
  await expect(pending).toContainText("The online store opens earlier than planned");
  await pending.getByPlaceholder("Type your full name to accept").fill("Omar Khalil");
  await pending.getByRole("button", { name: "Accept and add to the contract" }).click();
  await expect(client.getByTestId("change-requests")).toContainText("Accepted by the client");
  await expect(client.getByTestId("milestone")).toHaveCount(2);
});
