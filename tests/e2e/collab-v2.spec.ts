import { expect, test, type Page } from "@playwright/test";
import { joinAgency, login } from "./helpers";

// Collaboration V2 release 1 (docs/48-collaboration-v2.md): the R1 golden
// path with two real sessions (a buying agency and a freelancer), the
// audience preview, private quote comparison, the handoff into the existing
// partner-contract request, availability freshness and invitation links.

async function joinFreelancer(page: Page, prefix: string) {
  const handle = `${prefix}.${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  await page.goto("/en/join");
  await page.fill("#name", `Free ${handle}`);
  await page.fill("#handle", handle);
  await page.getByTestId("kind-freelancer").check();
  await page.locator('label:has(input[name="teamRoles"][value="photographer"])').click();
  await page.fill("#whatsapp", "0791112233");
  await page.fill("#email", `${handle}@test.jo`);
  await page.fill("#password", "password-123");
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Create page" }).click();
  await page.waitForURL(/\/en\/(setup|studio\/profile)/);
  return { handle, email: `${handle}@test.jo`, password: "password-123" };
}

test.describe.configure({ mode: "serial" });

test("publish a need, discover with availability, inquire, quote, compare, accept and hand off to the partner contract", async ({ browser }) => {
  test.setTimeout(180_000);
  const agency = await (await browser.newContext()).newPage();
  const freelancer = await (await browser.newContext()).newPage();
  const { handle: agencyHandle } = await joinAgency(agency, "buyer");
  const free = await joinFreelancer(freelancer, "photo");

  // The freelancer declares availability visible to any provider searching.
  await freelancer.goto("/en/studio/collab/availability");
  await expect(freelancer.getByTestId("availability-summary")).toContainText("needs confirmation");
  await freelancer.fill("#av-from", "2026-11-02");
  await freelancer.fill("#av-to", "2026-11-20");
  await freelancer.getByTestId("availability-visibility").selectOption("public");
  await freelancer.getByRole("button", { name: "Add period" }).click();
  await expect(freelancer.getByTestId("availability-window")).toHaveAttribute("data-fresh", "true");
  await expect(freelancer.getByTestId("availability-summary")).toContainText("confirmed and fresh");

  // The agency publishes a need for a photographer.
  await agency.goto("/en/studio/collab/needs");
  await agency.getByTestId("need-open").click();
  await agency.fill("#need-title", "Product photographer for a café launch");
  await agency.locator('label:has(input[name="roles"][value="photographer"])').click();
  await agency.fill("#need-scope", "Two mornings in Amman, natural light.");
  await agency.getByRole("button", { name: "Publish a need" }).click();
  await expect(agency.getByTestId("need-published")).toBeVisible();
  await expect(agency.getByTestId("my-need")).toHaveAttribute("data-status", "published");

  // The freelancer sees it in Discover and raises a hand.
  await freelancer.goto("/en/studio/collab");
  const need = freelancer.getByTestId("open-need").filter({ hasText: "café launch" }).filter({ hasText: agencyHandle });
  await expect(need).toBeVisible();
  await need.getByTestId("need-reply-open").click();
  await need.locator('textarea[name="note"]').fill("Happy to shoot both mornings.");
  await need.getByRole("button", { name: "Send", exact: true }).click();
  await expect(need.getByTestId("need-replied")).toBeVisible();

  // The agency discovers the photographer with confirmed availability and reasons, in the dates.
  await agency.goto("/en/studio/collab?role=photographer&from=2026-11-03&to=2026-11-06&q=1");
  const card = agency.getByTestId("provider-card").filter({ hasText: `Free ${free.handle}` });
  await expect(card).toBeVisible();
  await expect(agency.getByTestId("group-ready").getByTestId("provider-card").filter({ hasText: free.handle })).toHaveCount(1);
  await expect(card.getByTestId("availability-state")).toHaveAttribute("data-state", "confirmed");
  await expect(card.getByTestId("match-reasons")).toContainText("covers the role");
  // Confirmed-only leaves out demo/unknown providers entirely.
  await agency.goto("/en/studio/collab?role=photographer&from=2026-11-03&to=2026-11-06&confirmed=1&q=1");
  await expect(agency.getByTestId("group-needs_confirmation")).toHaveCount(0);
  await agency.getByTestId("provider-card").filter({ hasText: free.handle }).getByRole("button", { name: "Save to roster" }).click();
  await expect(agency.getByTestId("roster-saved")).toBeVisible();

  // A structured inquiry with an audience preview.
  await agency.getByTestId("provider-card").filter({ hasText: free.handle }).getByTestId("inquire-link").click();
  await expect(agency).toHaveURL(/\/studio\/collab\/work\/new\?to=/);
  await expect(agency.getByTestId("recipient-toggle").filter({ hasText: free.handle })).toHaveAttribute("aria-pressed", "true");
  await agency.fill("#inq-title", "Café launch shoot");
  await agency.getByRole("tab", { name: "On-site / offline" }).click();
  await agency.getByTestId("add-photo_session").click();
  await agency.fill("#inq-scope", "Two mornings, 60 edited photos.");
  await agency.fill("#inq-from", "2026-11-03");
  await agency.fill("#inq-to", "2026-11-12");
  await agency.fill("#inq-budget", "350");
  await agency.getByTestId("audience-preview-toggle").click();
  const fields = agency.getByTestId("preview-field");
  await expect(fields).toContainText(["Title", "Deliverables", "Budget"]);
  await expect(agency.getByTestId("audience-preview")).toContainText("Never sent: your client project");
  await agency.getByRole("button", { name: /Send to 1 provider/ }).click();
  await expect(agency).toHaveURL(/\/studio\/collab\/work\/[0-9a-f-]+\?sent=1/);
  await expect(agency.getByTestId("inquiry-sent")).toBeVisible();
  const inquiryUrl = agency.url().replace("?sent=1", "");

  // The freelancer gets it, sees only the shared projection, quotes, then counters.
  await freelancer.goto("/en/studio/notifications");
  await expect(freelancer.getByTestId("notification").filter({ hasText: "sent you a work inquiry" }).first()).toBeVisible();
  await freelancer.goto("/en/studio/collab/work");
  await expect(freelancer.getByTestId("supplying-row").filter({ hasText: "Café launch shoot" })).toHaveAttribute("data-status", "sent");
  await freelancer.getByTestId("supplying-row").filter({ hasText: "Café launch shoot" }).click();
  await expect(freelancer.getByTestId("inquiry-supplier")).toContainText("Photo session · 1 session");
  await expect(freelancer.getByTestId("inquiry-supplier")).toContainText(`Agency ${agencyHandle}`);
  await expect(freelancer.getByTestId("supplier-scope-note")).toBeVisible();
  await expect(freelancer.getByTestId("quotes-compare")).toHaveCount(0);
  await freelancer.fill("#q-amount", "380");
  await freelancer.fill("#q-scope", "60 edited photos, two rounds.");
  await freelancer.fill("#q-excl", "Props");
  await freelancer.getByRole("button", { name: "Send quote" }).click();
  await expect(freelancer.getByTestId("quote-sent")).toBeVisible();
  await freelancer.reload();
  await expect(freelancer.getByTestId("my-status")).toContainText("Quoted");
  await freelancer.getByTestId("quote-counter").click();
  await freelancer.fill("#q-amount", "360");
  await freelancer.fill("#q-scope", "50 edited photos, two rounds.");
  await freelancer.fill("#q-excl", "Props");
  await freelancer.getByRole("button", { name: "Send quote" }).click();
  await expect(freelancer.getByTestId("quote-sent")).toBeVisible();

  // The buyer compares: the counter replaced the first; only the buyer sees this.
  await agency.goto(inquiryUrl);
  await expect(agency.getByTestId("inquiry-status")).toContainText("Replies in");
  const quotes = agency.getByTestId("quotes-compare").getByTestId("quote-card");
  await expect(quotes).toHaveCount(1);
  await expect(quotes.first()).toContainText("360");
  await expect(quotes.first()).toContainText("Props");
  // Another agency cannot open this inquiry at all.
  const stranger = await (await browser.newContext()).newPage();
  await login(stranger, "nakhla-studio@sawwiq.test", "demo-pass-123");
  const res = await stranger.goto(inquiryUrl);
  expect(res?.status()).toBe(404);

  // Accept: not partners yet, so a partnership request goes first; the freelancer accepts it; then the contract request.
  await agency.getByTestId("quote-accept").click();
  // The page re-renders from the server: the handoff panel is the record, and the accept button is gone.
  await expect(agency.getByTestId("handoff-waiting")).toBeVisible();
  await expect(agency.getByTestId("inquiry-status")).toContainText("Accepted");
  await expect(agency.getByTestId("quote-accept")).toHaveCount(0);
  await freelancer.goto("/en/studio/partners");
  await freelancer.getByTestId("partner-incoming").filter({ hasText: agencyHandle }).getByTestId("partner-accept").click();
  await expect(freelancer.getByTestId("partner-accepted").filter({ hasText: agencyHandle })).toBeVisible();
  await agency.reload();
  await agency.getByTestId("handoff-retry").click();
  await expect(agency.getByTestId("handoff-contracts")).toBeVisible();
  // The supplier finds the existing contract request and can create the contract from it (docs/14).
  await freelancer.goto("/en/studio/contracts");
  await expect(freelancer.getByTestId("contract-request").filter({ hasText: "Café launch shoot" })).toBeVisible();
  await expect(freelancer.getByTestId("contract-request").filter({ hasText: "Café launch shoot" })).toContainText("360");
  await freelancer.getByTestId("create-from-request").first().click();
  await expect(freelancer).toHaveURL(/\/studio\/contracts\/new\?partner=/);
  await expect(freelancer.locator("#c-title")).toHaveValue("Café launch shoot");

  // Rehire from the roster: a fresh draft inquiry, nothing booked.
  await agency.goto("/en/studio/collab/network");
  const entry = agency.getByTestId("roster-entry").filter({ hasText: free.handle });
  await expect(entry).toContainText("Accepted partner");
  await expect(entry.getByTestId("roster-inquire")).toHaveText("Rehire");
  await entry.getByTestId("roster-inquire").click();
  await expect(agency).toHaveURL(/\/studio\/collab\/work\/new\?to=/);
  await expect(agency.getByTestId("recipient-toggle").filter({ hasText: free.handle })).toHaveAttribute("aria-pressed", "true");
});

test("an invitation link makes two providers partners once, in Arabic on a phone", async ({ browser }) => {
  test.setTimeout(120_000);
  const sender = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await joinAgency(sender, "inviter");
  await sender.goto("/ar/studio/collab/network");
  await expect(sender.getByTestId("collab-tabs")).toBeVisible();
  await sender.fill("#inv-label", "لينا");
  await sender.getByRole("button", { name: "أنشئ الرابط" }).click();
  const link = (await sender.getByTestId("invite-link").textContent())!.trim();
  expect(link).toMatch(/\/ar\/invite\/[A-Za-z0-9_-]{20,}/);
  const path = new URL(link).pathname;

  // A stranger who is not signed in sees who invites and a way in; no data leaks.
  const guest = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await guest.goto(path);
  await expect(guest.getByTestId("invite-page")).toContainText("يدعوك للتعاون");
  await expect(guest.getByTestId("invite-join")).toHaveAttribute("href", /\/ar\/join\?invite=/);
  await expect(guest.getByTestId("invite-page")).not.toContainText("@");

  // Signed in, the demo freelancer accepts; a second visit shows it already used.
  await login(guest, "salt-stories@sawwiq.test", "demo-pass-123");
  await guest.goto(path);
  await guest.getByRole("button", { name: "قبول" }).click();
  await expect(guest).toHaveURL(/\/ar\/studio\/collab\/network\?invited=1/);
  await expect(guest.getByTestId("invite-accepted-note")).toBeVisible();
  await guest.goto(path);
  await expect(guest.getByTestId("invite-status")).toContainText("مقبول");

  await sender.reload();
  await expect(sender.getByTestId("invite-row").first()).toHaveAttribute("data-status", "accepted");
  await expect(sender.getByTestId("roster-entry").filter({ hasText: "Salt Stories" })).toBeVisible();
  // No horizontal overflow on the phone.
  expect(await sender.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await sender.goto("/ar/studio/collab");
  expect(await sender.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
