import { expect, test, type Page } from "@playwright/test";
import { ADMIN, drawSignature, joinAgency, login } from "./helpers";

// The whole milestone system (docs/14): test-mode payments said plainly,
// review deadline, revision rounds, a dispute with evidence from both sides,
// an admin split decision, one appeal and the final decision; and partner
// contracts signed from the buying agency's studio.

async function tickAll(page: Page, index = 0) {
  const boxes = page.getByTestId("milestone").nth(index).getByTestId("checklist").locator('input[type="checkbox"]');
  const n = await boxes.count();
  for (let i = 0; i < n; i++) {
    await boxes.nth(i).check();
    await expect(boxes.nth(i)).toBeChecked();
  }
  await page.waitForLoadState("networkidle");
}

async function sign(page: Page, name: string) {
  await page.fill("#signer", name);
  await drawSignature(page);
  await page.getByText(/I have read this document and agree to it/).click();
  await page.getByRole("button", { name: "Sign contract" }).click();
  await expect(page.getByTestId("contract-status")).toHaveText("Active");
}

test("two milestones: pay in, deliver, changes (rounds), dispute with evidence, split decision, appeal, final", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const { handle } = await joinAgency(page, "full");
  await page.goto("/en/studio/contracts/new");
  await expect(page.getByTestId("guaranteed-payment")).toHaveAttribute("data-live", "false");
  await expect(page.getByTestId("guaranteed-payment")).toContainText("test mode");
  await page.fill("#c-name", "Hala Bakery");
  await page.fill("#c-phone", "0790000044");
  await page.fill("#c-title", "Brand refresh for Hala Bakery");
  await page.fill("#c-total", "300");
  await page.getByTestId("split-2").click();
  const rows = page.getByTestId("milestone-row");
  await expect(rows).toHaveCount(2);
  await rows.nth(0).locator("textarea").fill("New logo\nMenu design");
  await rows.nth(1).locator("textarea").fill("Launch posts");
  await expect(page.getByTestId("revision-rounds")).toHaveValue("2");
  await page.fill("#c-signer", "Maya Full");
  await drawSignature(page);
  await page.getByText(/I agree to this document on behalf of/).click();
  await page.getByRole("button", { name: "Sign and send to client" }).click();
  await expect(page).toHaveURL(/\/en\/studio\/contracts\/[0-9a-f-]+\?sent=1/);
  const clientUrl = (await page.getByTestId("client-link").textContent())!.trim();
  const agencyUrl = page.url().split("?")[0];

  // Client: the terms say test mode, deemed acceptance and revision rounds; sign and pay milestone 1.
  const client = await (await browser.newContext()).newPage();
  await client.goto(clientUrl);
  await expect(client.getByTestId("payments-readiness")).toContainText("Protected payments are in test mode");
  const doc = client.getByTestId("contract-document");
  await expect(doc).toContainText("Protected payments on Sawwiq are in test mode");
  await expect(doc).toContainText("deemed accepted");
  await expect(doc).toContainText("2 rounds of changes");
  await expect(doc).not.toContainText("held by Sawwiq");
  await sign(client, "Hala Haddad");
  await client.getByRole("button", { name: /Pay 150 JOD into protection/ }).click();
  await expect(client.getByTestId("payments-readiness")).toContainText("Test checkout: no real money");
  await client.getByRole("button", { name: "Pay now (test)" }).click();
  await expect(client.getByTestId("funded-ok")).toBeVisible();
  await expect(client.getByTestId("receipt").filter({ hasText: "Milestone paid in" })).toBeVisible();

  // Agency delivers: the review deadline starts.
  await page.goto(agencyUrl);
  await expect(page.getByTestId("milestone").first()).toHaveAttribute("data-status", "funded");
  await tickAll(page);
  await page.getByTestId("milestone").first().locator('textarea[name="note"]').fill("Logo and menu in the shared folder");
  await page.getByRole("button", { name: "Send for approval" }).click();
  await expect(page.getByTestId("milestone").first()).toHaveAttribute("data-status", "submitted");
  await expect(page.getByTestId("review-deadline")).toContainText("7 days left");

  // Client asks for changes: one round used.
  await client.reload();
  await expect(client.getByTestId("review-deadline")).toContainText("Review by");
  await expect(client.getByTestId("milestone").first().getByTestId("rounds-left")).toContainText("2 of 2 left");
  await client.getByTestId("milestone").first().locator("summary", { hasText: "Request changes" }).click();
  await client.getByTestId("milestone").first().locator('textarea[name="note"]').fill("The menu font is hard to read");
  await client.getByTestId("milestone").first().getByRole("button", { name: "Request changes" }).click();
  await expect(client.getByTestId("milestone").first()).toHaveAttribute("data-status", "changes_requested");
  await expect(client.getByTestId("milestone").first().getByTestId("rounds-left")).toContainText("1 of 2 left");

  // Agency resubmits.
  await page.reload();
  await expect(page.getByTestId("milestone").first().getByTestId("rounds-left")).toContainText("1 of 2 left");
  await page.getByTestId("milestone").first().locator('textarea[name="note"]').fill("Bigger menu font");
  await page.getByRole("button", { name: "Send for approval" }).click();
  await expect(page.getByTestId("milestone").first()).toHaveAttribute("data-status", "submitted");

  // Client opens a dispute on milestone 1 and adds evidence; the agency answers with its own.
  await client.reload();
  await client.getByTestId("open-dispute").getByText("Report a problem").click();
  await client.getByTestId("open-dispute").locator('textarea[name="note"]').fill("The menu still doesn't match the brief we signed");
  await client.getByRole("button", { name: "Send to Sawwiq" }).click();
  await expect(client.getByTestId("dispute-card")).toHaveAttribute("data-status", "open");
  await client.getByTestId("evidence-form").getByText("Add evidence").click();
  await client.getByTestId("evidence-form").locator('textarea[name="body"]').fill("Brief asked for Arabic and English menus; only English arrived");
  await client.getByTestId("evidence-form").locator('textarea[name="links"]').fill("https://example.com/brief.pdf");
  await client.getByRole("button", { name: "Send evidence" }).click();
  await expect(client.getByTestId("evidence-list")).toContainText("only English arrived");

  await page.reload();
  await expect(page.getByTestId("dispute-card")).toContainText("doesn't match the brief");
  await page.getByTestId("evidence-form").getByText("Add evidence").click();
  await page.getByTestId("evidence-form").locator('textarea[name="body"]').fill("The Arabic menu was sent by WhatsApp on day 3");
  await page.getByRole("button", { name: "Send evidence" }).click();
  await expect(page.getByTestId("evidence-list")).toContainText("sent by WhatsApp");

  // Admin: sees both sides' evidence and splits the held 150.
  const admin = await (await browser.newContext()).newPage();
  await login(admin, ADMIN.email, ADMIN.password);
  await admin.goto("/en/admin/payments?tab=protected");
  const card = admin.getByTestId("dispute").filter({ hasText: `Agency ${handle}` });
  await expect(card.getByTestId("admin-evidence")).toContainText("only English arrived");
  await expect(card.getByTestId("admin-evidence")).toContainText("sent by WhatsApp");
  await card.getByTestId("split-release").fill("100");
  await card.getByTestId("split-refund").fill("50");
  await card.getByTestId("decision-reason").fill("Logo delivered in full; the menu is half done (English only).");
  await card.getByRole("button", { name: "Issue decision (appealable for 7 days)" }).click();
  await expect(card.getByTestId("admin-dispute")).toHaveAttribute("data-status", "decided");
  await expect(card).toContainText("Appeal window until");

  // Client appeals once.
  await client.reload();
  await expect(client.getByTestId("dispute-decision")).toContainText("Split: 100 JOD to the agency, 50 JOD refunded to the client");
  await client.getByTestId("appeal-form").getByText("Appeal the decision").click();
  await client.getByTestId("appeal-form").locator('textarea[name="note"]').fill("The Arabic menu never arrived, the WhatsApp message was a draft");
  await client.getByRole("button", { name: "Send appeal" }).click();
  await expect(client.getByTestId("dispute-card")).toHaveAttribute("data-status", "appealed");
  await expect(client.getByTestId("appeal-form")).toHaveCount(0);

  // Admin: final decision, money settled once, fee only on the part paid out.
  await admin.reload();
  const again = admin.getByTestId("dispute").filter({ hasText: `Agency ${handle}` });
  await expect(again).toContainText("The Arabic menu never arrived");
  await again.getByTestId("split-release").fill("75");
  await again.getByTestId("split-refund").fill("75");
  await again.getByTestId("decision-reason").fill("On appeal: the Arabic menu was a draft, so half the milestone is refunded.");
  await again.getByRole("button", { name: "Issue the final decision" }).click();
  await expect(again.getByTestId("admin-dispute")).toHaveCount(0); // settled: the case leaves the list

  await client.reload();
  await expect(client.getByTestId("dispute-card")).toHaveAttribute("data-status", "final");
  await expect(client.getByTestId("dispute-decision")).toContainText("Final decision");
  await expect(client.getByTestId("milestone").first()).toHaveAttribute("data-status", "split");
  await expect(client.getByTestId("contract-status")).toHaveText("Active");
  await expect(client.getByTestId("receipt")).toHaveCount(3);
  await expect(client.getByTestId("receipt").filter({ hasText: "Paid out to the agency" })).toContainText("Gross 75 JOD");
  const pdf = await client.request.get((await client.getByTestId("receipt-pdf").first().getAttribute("href"))!);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
});

test("partner contract: an agency asks a partner for a contract, the partner creates it, the agency signs from its studio", async ({ browser }) => {
  test.setTimeout(150_000);
  const buyer = await (await browser.newContext()).newPage();
  const { handle } = await joinAgency(buyer, "buyer");
  await buyer.locator('label:has(input[name="seeksRoles"][value="videographer"])').click();
  await buyer.getByTestId("profile-form").getByRole("button", { name: "Save" }).click();
  await expect(buyer.getByRole("status")).toBeVisible();
  await buyer.goto("/en/studio/partners");
  const freelancer = buyer.getByTestId("partner-suggestion").filter({ hasText: "Salt Stories" });
  await freelancer.getByTestId("partner-open").click();
  await freelancer.locator('textarea[name="message"]').fill(`Video for our clients, from ${handle}`);
  await freelancer.getByRole("button", { name: "Send request" }).click();
  await expect(buyer.getByTestId("partner-outgoing").filter({ hasText: "Salt Stories" })).toBeVisible();

  const partner = await (await browser.newContext()).newPage();
  await login(partner, "salt-stories@sawwiq.test", "demo-pass-123");
  await partner.goto("/en/studio/partners");
  await partner.getByTestId("partner-incoming").filter({ hasText: handle }).getByTestId("partner-accept").click();
  await expect(partner.getByTestId("partner-accepted").filter({ hasText: `Agency ${handle}` })).toBeVisible();

  // The buying agency asks for a contract.
  await buyer.goto("/en/studio/partners");
  const row = buyer.getByTestId("partner-accepted").filter({ hasText: "Salt Stories" });
  await row.getByTestId("partner-contract-request").getByText("Ask this partner for a contract").click();
  const title = `Reels for ${handle}`;
  await row.locator('input[name="title"]').fill(title);
  await row.locator('textarea[name="brief"]').fill("Four reels for a gym client in October");
  await row.locator('input[name="budget"]').fill("400");
  await row.getByRole("button", { name: "Send request" }).click();
  await expect(row.getByText("Request sent to your partner.")).toBeVisible();

  // The partner is notified and creates the contract, prefilled with the buying agency as client.
  await partner.goto("/en/studio/notifications");
  await expect(partner.getByTestId("notification").filter({ hasText: title }).first()).toBeVisible();
  await partner.goto("/en/studio/contracts");
  await partner.getByTestId("contract-request").filter({ hasText: title }).getByTestId("create-from-request").click();
  await expect(partner.getByTestId("partner-contract-note")).toContainText(`Agency ${handle}`);
  await expect(partner.locator("#c-name")).toHaveValue(`Agency ${handle}`);
  await expect(partner.locator("#c-title")).toHaveValue(title);
  await expect(partner.locator("#c-total")).toHaveValue("400");
  await partner.getByTestId("split-1").click();
  await partner.getByTestId("milestone-row").locator("textarea").fill("4 reels delivered");
  await partner.fill("#c-signer", "Salt Owner");
  await drawSignature(partner);
  await partner.getByText(/I agree to this document on behalf of/).click();
  await partner.getByRole("button", { name: "Sign and send to client" }).click();
  await expect(partner).toHaveURL(/\/en\/studio\/contracts\/[0-9a-f-]+\?sent=1/);
  await expect(partner.getByTestId("partner-client")).toContainText(`Agency ${handle}`);

  // The buying agency signs from its studio, no private link.
  await buyer.goto("/en/studio/contracts");
  await buyer.getByTestId("buying-contract-row").filter({ hasText: title }).click();
  await expect(buyer.getByTestId("buying-contract")).toContainText("You're the client");
  await sign(buyer, "Buyer Owner");
  await buyer.getByRole("button", { name: /Pay 400 JOD into protection/ }).click();
  await buyer.getByRole("button", { name: "Pay now (test)" }).click();
  await expect(buyer.getByTestId("funded-ok")).toBeVisible();
  await expect(buyer.getByTestId("money-held")).toContainText("400");

  await partner.goto("/en/studio/notifications");
  await expect(partner.getByTestId("notification").filter({ hasText: "signed the contract" }).first()).toBeVisible();
});
