import { expect, test } from "@playwright/test";
import { ADMIN, joinAgency, login, uniqueHandle } from "./helpers";

// Services as tags (with admin review of new ones) and agencies finding partners (docs/30).

test("an agency types a new service; an admin approves it and it becomes a tag on the agency's page", async ({ browser }) => {
  const agencyPage = await (await browser.newContext()).newPage();
  const handle = uniqueHandle("tags");
  const service = `Hologram shows ${handle.slice(-4)}`;
  await agencyPage.goto("/en/join");
  await agencyPage.fill("#name", `Agency ${handle}`);
  await agencyPage.fill("#handle", handle);
  // Who's on the team: no videographer, so partners are offered for it.
  await agencyPage.locator('label:has(input[name="teamRoles"][value="photographer"])').click();
  await agencyPage.getByTestId("service-search").fill("reels");
  await agencyPage.getByTestId("service-suggestion").first().click();
  await agencyPage.getByTestId("service-search").fill(service);
  await agencyPage.getByTestId("service-add-new").click();
  await expect(agencyPage.getByTestId("new-service")).toContainText(service);
  await agencyPage.fill("#whatsapp", "0791112233");
  await agencyPage.fill("#email", `${handle}@test.jo`);
  await agencyPage.fill("#password", "password-123");
  await agencyPage.check('input[name="consent"]');
  await agencyPage.getByRole("button", { name: "Create page" }).click();
  await agencyPage.waitForURL(/\/en\/studio\/profile/);
  // Waiting for review in the studio, not on the public page yet.
  await expect(agencyPage.getByTestId("service-picker")).toContainText(service);
  await agencyPage.goto(`/en/a/${handle}?tab=about`);
  await expect(agencyPage.locator("dl").last()).not.toContainText(service);

  const adminPage = await (await browser.newContext()).newPage();
  await login(adminPage, ADMIN.email, ADMIN.password);
  await adminPage.goto("/en/admin/services");
  const card = adminPage.getByTestId("pending-service").filter({ hasText: service });
  await card.locator('input[name="nameAr"]').fill(`عروض هولوغرام ${handle.slice(-4)}`);
  await card.locator('select[name="parent"]').selectOption("activations");
  await card.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(adminPage.getByRole("status").filter({ hasText: service })).toBeVisible();

  await agencyPage.goto(`/en/a/${handle}?tab=about`);
  await expect(agencyPage.locator("dl").last()).toContainText(service);
  await agencyPage.goto("/ar/studio/profile");
  await agencyPage.getByTestId("service-search").fill("هولوغرام");
  // Already on the agency, so it's no longer suggested; the tag shows as picked.
  await expect(agencyPage.getByTestId("picked-service").filter({ hasText: "هولوغرام" })).toHaveCount(1);
});

test("an agency without a videographer finds a freelancer, who accepts the partnership", async ({ browser }) => {
  const agency = await (await browser.newContext()).newPage();
  const { handle } = await joinAgency(agency, "partner");
  // Profile: a photographer in house, looking for a videographer.
  await agency.locator('label:has(input[name="teamRoles"][value="photographer"])').click();
  await agency.locator('label:has(input[name="seeksRoles"][value="videographer"])').click();
  await agency.getByTestId("profile-form").getByRole("button", { name: "Save" }).click();
  await expect(agency.getByRole("status")).toBeVisible();

  await agency.goto("/en/studio/partners");
  await expect(agency.getByTestId("partners-page")).toContainText("Looking for");
  const freelancer = agency.getByTestId("partner-suggestion").filter({ hasText: "Freelancer" }).filter({ hasText: "Salt Stories" });
  await expect(freelancer).toBeVisible();
  await freelancer.getByTestId("partner-open").click();
  const note = `Reels for a café client, from ${handle}`;
  await freelancer.locator('textarea[name="message"]').fill(note);
  await freelancer.getByRole("button", { name: "Send request" }).click();
  // It moves from the suggestions to the requests you sent.
  await expect(agency.getByTestId("partner-outgoing").filter({ hasText: "Salt Stories" })).toBeVisible();

  const other = await (await browser.newContext()).newPage();
  await login(other, "salt-stories@sawwiq.test", "demo-pass-123");
  await other.goto("/en/studio/notifications");
  await expect(other.getByTestId("notification").filter({ hasText: "wants to work with you" }).first()).toBeVisible();
  await other.goto("/en/studio/partners");
  await other.getByTestId("partner-incoming").filter({ hasText: note }).getByTestId("partner-accept").click();
  await expect(other.getByTestId("partner-accepted").filter({ hasText: `Agency ${handle}` })).toBeVisible();

  await agency.goto("/en/studio/partners");
  await expect(agency.getByTestId("partner-accepted").filter({ hasText: "Salt Stories" }).getByRole("link", { name: "WhatsApp" })).toBeVisible();
});
