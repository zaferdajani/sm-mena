import { expect, test } from "@playwright/test";
import { drawSignature, joinAgency, login } from "./helpers";

// Partners on client milestones (docs/40): an agency brings a freelancer in on
// one milestone for a share of it; the freelancer accepts and can deliver it.
test("an agency offers a partner a share of a milestone, and the partner accepts and sees its work", async ({ browser }) => {
  const agency = await (await browser.newContext()).newPage();
  const { handle } = await joinAgency(agency, "collab");

  // Become partners with a freelancer (demo account Salt Stories).
  await agency.goto("/en/studio/partners");
  const freelancer = agency.getByTestId("partner-suggestion").filter({ hasText: "Salt Stories" }).first();
  await freelancer.getByTestId("partner-open").click();
  await freelancer.locator('textarea[name="message"]').fill(`Photos for a café, from ${handle}`);
  await freelancer.getByRole("button", { name: "Send request" }).click();
  const partner = await (await browser.newContext()).newPage();
  await login(partner, "salt-stories@sawwiq.test", "demo-pass-123");
  await partner.goto("/en/studio/partners");
  await partner.getByTestId("partner-incoming").filter({ hasText: handle }).getByTestId("partner-accept").click();
  await expect(partner.getByTestId("partner-accepted").filter({ hasText: `Agency ${handle}` })).toBeVisible();

  // A two-milestone contract, sent to the client.
  await agency.goto("/en/studio/contracts/new");
  await agency.fill("#c-name", "Nour Café");
  await agency.fill("#c-phone", "0790000001");
  await agency.fill("#c-title", "Launch with a product shoot");
  await agency.fill("#c-total", "500");
  await agency.getByTestId("split-2").click();
  const rows = agency.getByTestId("milestone-row");
  await expect(rows).toHaveCount(2);
  await rows.nth(0).getByLabel("Name", { exact: true }).fill("Content plan");
  await rows.nth(1).getByLabel("Name", { exact: true }).fill("Product photography");
  for (const i of [0, 1]) await rows.nth(i).getByLabel("Checklist (one item per line)").fill("Delivered as agreed");
  await agency.fill("#c-signer", "Sara Haddad");
  await drawSignature(agency);
  await agency.getByText(/I agree to this document on behalf of/).click();
  await agency.getByRole("button", { name: "Sign and send to client" }).click();
  await expect(agency).toHaveURL(/\/en\/studio\/contracts\/[0-9a-f-]+\?sent=1/);

  // Offer the photographer 40% of the photography milestone.
  const panel = agency.getByTestId("milestone-partners");
  await expect(panel).toBeVisible();
  const row = panel.locator('[data-testid^="share-row-"]').filter({ hasText: "Product photography" });
  await row.getByText("Add a partner to this milestone").click();
  await row.locator('input[name="percent"]').fill("40");
  await row.getByRole("button", { name: "Send the offer to the partner" }).click();
  await expect(row.getByTestId("share-status")).toHaveText("Waiting for the partner");

  // The partner accepts and opens its milestone.
  await partner.goto("/en/studio/contracts");
  const work = partner.getByTestId("partner-work-item").filter({ hasText: "Product photography" }).filter({ hasText: handle });
  await expect(work).toContainText("100");
  await work.getByRole("button", { name: "Accept" }).click();
  await work.getByTestId("partner-work-open").click();
  await expect(partner.getByTestId("partner-work-page")).toContainText("Product photography");
  await expect(partner.getByTestId("partner-work-page")).toContainText("Your share");

  await agency.reload();
  await expect(agency.getByTestId("milestone-partners").locator('[data-testid^="share-row-"]').filter({ hasText: "Product photography" }).getByTestId("share-status")).toHaveText("Agreed");
});
