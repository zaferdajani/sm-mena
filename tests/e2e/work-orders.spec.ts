import { expect, test, type Page } from "@playwright/test";
import { drawSignature, joinAgency, login, pngBuffer, nextJoinStep } from "./helpers";

// Collaboration V2 release 2 (docs/49-work-orders.md): a buying agency and a
// freelancer go from an accepted quote to a versioned work order, the
// supplier accepts under a capacity hold, both exchange files with pinned
// comments in a shared thread the buyer's private notes never join, the
// supplier submits, the buyer asks for changes then approves, and the linked
// protected milestone is released through the contract's own path.

async function joinFreelancer(page: Page, prefix: string) {
  const handle = `${prefix}.${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  await page.goto("/en/join");
  await page.fill("#name", `Free ${handle}`);
  await page.fill("#handle", handle);
  await nextJoinStep(page);
  await page.getByTestId("kind-freelancer").check();
  await page.locator('label:has(input[name="teamRoles"][value="photographer"])').click();
  await nextJoinStep(page);
  await page.fill("#whatsapp", "0791112233");
  await page.fill("#email", `${handle}@test.jo`);
  await page.fill("#password", "password-123");
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Create page" }).click();
  // Sign-up opens the first-run setup (docs/53); this test continues in the full profile editor.
  await page.waitForURL(/\/en\/portfolio-setup/);
  await page.goto("/en/studio/profile?welcome=1");
  return { handle, email: `${handle}@test.jo`, password: "password-123" };
}

async function signAsBuyer(page: Page, name: string) {
  await page.fill("#signer", name);
  await drawSignature(page);
  await page.getByText(/I have read this document and agree to it/).click();
  await page.getByRole("button", { name: "Sign contract" }).click();
  await expect(page.getByTestId("contract-status")).toHaveText("Active");
}

test.describe.configure({ mode: "serial" });

test("from an accepted quote to an approved work order that releases the protected milestone", async ({ browser }) => {
  test.setTimeout(240_000);
  const agency = await (await browser.newContext()).newPage();
  const freelancer = await (await browser.newContext()).newPage();
  const { handle: agencyHandle } = await joinAgency(agency, "wo");
  const free = await joinFreelancer(freelancer, "shoot");

  // Capacity: one unit declared for November, so a second order on the same day cannot be accepted.
  await freelancer.goto("/en/studio/collab/availability");
  await freelancer.fill("#av-from", "2026-11-02");
  await freelancer.fill("#av-to", "2026-11-20");
  await freelancer.getByTestId("availability-visibility").selectOption("public");
  await freelancer.locator("#av-units").fill("1");
  await freelancer.getByRole("button", { name: "Add period" }).click();
  await expect(freelancer.getByTestId("availability-window")).toHaveAttribute("data-fresh", "true");

  // Inquiry → quote → accept → partners → contract request (R1 path, condensed).
  await agency.goto("/en/studio/collab?role=photographer&from=2026-11-03&to=2026-11-06&q=1");
  await agency.getByTestId("provider-card").filter({ hasText: free.handle }).getByTestId("inquire-link").click();
  await expect(agency.getByTestId("recipient-toggle").filter({ hasText: free.handle })).toHaveAttribute("aria-pressed", "true");
  await agency.fill("#inq-title", "Menu shoot for a café");
  await agency.getByRole("tab", { name: "On-site / offline" }).click();
  await agency.getByTestId("add-photo_session").click();
  await agency.fill("#inq-scope", "One morning, 30 edited photos.");
  await agency.fill("#inq-from", "2026-11-03");
  await agency.fill("#inq-to", "2026-11-10");
  await agency.fill("#inq-budget", "200");
  await agency.getByRole("button", { name: /Send to 1 provider/ }).click();
  await expect(agency).toHaveURL(/\/studio\/collab\/work\/[0-9a-f-]+\?sent=1/);
  const inquiryUrl = agency.url().replace("?sent=1", "");
  await freelancer.goto(inquiryUrl);
  await freelancer.fill("#q-amount", "200");
  await freelancer.fill("#q-scope", "30 edited photos.");
  await freelancer.getByRole("button", { name: "Send quote" }).click();
  await expect(freelancer.getByTestId("quote-sent")).toBeVisible();
  await agency.goto(inquiryUrl);
  await agency.getByTestId("quote-accept").click();
  await expect(agency.getByTestId("handoff-waiting")).toBeVisible();
  await freelancer.goto("/en/studio/partners");
  await freelancer.getByTestId("partner-incoming").filter({ hasText: agencyHandle }).getByTestId("partner-accept").click();
  await expect(freelancer.getByTestId("partner-accepted").filter({ hasText: agencyHandle })).toBeVisible();
  await agency.reload();
  await agency.getByTestId("handoff-retry").click();
  await expect(agency.getByTestId("handoff-contracts")).toBeVisible();

  // The supplier writes the contract from the request; the buyer signs in its studio and funds the milestone (test checkout).
  await freelancer.goto("/en/studio/contracts");
  await freelancer.getByTestId("contract-request").filter({ hasText: "Menu shoot for a café" }).getByTestId("create-from-request").click();
  await expect(freelancer.locator("#c-total")).toHaveValue("200");
  await freelancer.getByTestId("split-1").click();
  await freelancer.getByTestId("milestone-row").locator("textarea").fill("30 edited photos delivered");
  await freelancer.fill("#c-signer", "Free Owner");
  await drawSignature(freelancer);
  await freelancer.getByText(/I agree to this document on behalf of/).click();
  await freelancer.getByRole("button", { name: "Sign and send to client" }).click();
  await expect(freelancer).toHaveURL(/\/en\/studio\/contracts\/[0-9a-f-]+\?sent=1/);
  const contractUrl = freelancer.url().split("?")[0];
  await agency.goto("/en/studio/contracts");
  await agency.getByTestId("buying-contract-row").filter({ hasText: "Menu shoot for a café" }).click();
  await signAsBuyer(agency, "Buyer Owner");
  await agency.getByRole("button", { name: /Pay 200 JOD into protection/ }).click();
  await agency.getByRole("button", { name: "Pay now (test)" }).click();
  await expect(agency.getByTestId("funded-ok")).toBeVisible();

  // The work order: prefilled from the accepted quote, linked to the contract milestone, offered.
  await agency.goto(inquiryUrl);
  await agency.getByTestId("handoff-order").click();
  await expect(agency).toHaveURL(/\/studio\/collab\/orders\/new\?inquiry=/);
  await expect(agency.locator("#o-title")).toHaveValue("Menu shoot for a café");
  await expect(agency.getByTestId("order-form").getByTestId("deliverables-picker")).toContainText("Photo session");
  await agency.fill("#due", "2026-11-05");
  await agency.fill("#rev", "1");
  await agency.fill("#comp", "Paid under the contract milestone; no separate amount.");
  await agency.getByTestId("order-contract").selectOption({ index: 1 });
  await agency.getByTestId("order-milestone").selectOption({ index: 1 });
  await agency.getByRole("button", { name: "Offer to the supplier" }).click();
  await expect(agency).toHaveURL(/\/studio\/collab\/orders\/[0-9a-f-]+$/);
  const orderUrl = agency.url();
  await expect(agency.getByTestId("order-status")).toHaveAttribute("data-status", "offered");
  await expect(agency.getByTestId("order-hold")).toHaveAttribute("data-hold", "tentative");
  await expect(agency.getByTestId("order-money")).toHaveAttribute("data-headline", "in_delivery");
  await expect(agency.getByTestId("money-stages").locator("[data-stage='funding']")).toHaveAttribute("data-state", "done");

  // A stranger cannot open it; the supplier sees the offer, the scope, no private notes, and accepts.
  const stranger = await (await browser.newContext()).newPage();
  await login(stranger, "nakhla-studio@sawwiq.test", "demo-pass-123");
  expect((await stranger.goto(orderUrl))?.status()).toBe(404);
  await freelancer.goto("/en/studio/notifications");
  await expect(freelancer.getByTestId("notification").filter({ hasText: "offered you a work order" }).first()).toBeVisible();
  await freelancer.goto(orderUrl);
  await expect(freelancer.getByTestId("order-page")).toHaveAttribute("data-role", "supplier");
  await expect(freelancer.getByTestId("version-answer")).toContainText("Photo session · 1 session");
  await expect(freelancer.getByTestId("order-private")).toHaveCount(0);
  await expect(freelancer.getByTestId("order-parent")).toHaveCount(0);
  await freelancer.getByTestId("order-accept").click();
  await expect(freelancer.getByTestId("order-status")).toHaveAttribute("data-status", "accepted");
  await expect(freelancer.getByTestId("order-hold")).toHaveAttribute("data-hold", "confirmed");
  await expect(freelancer.getByTestId("order-terms")).toHaveAttribute("data-intact", "true");

  // The buyer's private note stays private; the shared message reaches the supplier.
  await agency.goto(orderUrl);
  await agency.getByTestId("composer-private").locator("textarea").fill("Client budget is actually 350; keep that to ourselves.");
  await agency.getByTestId("send-private").click();
  await expect(agency.getByTestId("message-private")).toContainText("350");
  await agency.getByTestId("composer-shared").locator("textarea").fill("Natural light please, no flash.");
  await agency.getByTestId("send-shared").click();
  await expect(agency.getByTestId("message-shared")).toContainText("no flash");
  await freelancer.reload();
  await expect(freelancer.getByTestId("message-shared")).toContainText("no flash");
  await expect(freelancer.getByTestId("order-page")).not.toContainText("350");

  // Files: the supplier uploads a draft; the buyer pins a comment; a new version supersedes the draft.
  await freelancer.getByTestId("upload-input").setInputFiles({ name: "menu-draft.png", mimeType: "image/png", buffer: await pngBuffer("#b04a2a") });
  await freelancer.getByTestId("upload-submit").click();
  await expect(freelancer.getByTestId("asset")).toHaveCount(1);
  await expect(freelancer.getByTestId("order-status")).toHaveAttribute("data-status", "in_progress");
  await agency.reload();
  const image = agency.getByTestId("asset-image").first();
  await expect(image).toBeVisible();
  // The pin is React state on the image's button; a tap that lands before hydration does nothing (seen on the
  // phone project under two workers), so tap until the form confirms the pin, as a person would.
  await expect(async () => {
    await image.click({ position: { x: 40, y: 30 } });
    await expect(agency.getByTestId("comment-form")).toContainText("Pinned at", { timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await agency.getByTestId("comment-input").fill("Crop tighter on the plate.");
  await agency.getByTestId("comment-submit").click();
  await expect(agency.getByTestId("asset-comment")).toContainText("Crop tighter");
  await freelancer.reload();
  await freelancer.getByTestId("upload-group").selectOption({ index: 1 });
  await freelancer.getByTestId("upload-input").setInputFiles({ name: "menu-v2.png", mimeType: "image/png", buffer: await pngBuffer("#2a6ab0") });
  await freelancer.getByTestId("upload-submit").click();
  await expect(freelancer.getByTestId("asset")).toHaveCount(1);
  await expect(freelancer.getByTestId("asset")).toHaveAttribute("data-version", "2");
  await expect(freelancer.getByTestId("asset-older")).toContainText("1 earlier version");
  // The file is private: a signed-out request and a stranger both get nothing.
  const src = await freelancer.getByTestId("asset-image").first().getAttribute("src");
  const anon = await (await browser.newContext({ storageState: undefined })).newPage();
  expect((await anon.goto(src!))?.status()).toBe(404);
  expect((await stranger.goto(src!))?.status()).toBe(404);

  // Round 1: submit → changes requested (also a revision round on the contract milestone once it is submitted there).
  await freelancer.locator('[data-testid="submit-form"] textarea').fill("Round 1: 30 photos in the folder.");
  await freelancer.getByTestId("submit-work").click();
  await expect(freelancer.getByTestId("order-status")).toHaveAttribute("data-status", "submitted");
  await agency.reload();
  await expect(agency.getByTestId("decision-form")).toContainText("also approves the milestone");
  await agency.locator('[data-testid="decision-form"] textarea').fill("Two photos are soft; please reshoot.");
  await agency.getByTestId("request-changes").click();
  // The page re-renders from the server: the round carries the decision and its honest contract effect.
  await expect(agency.getByTestId("order-status")).toHaveAttribute("data-status", "changes_requested");
  await expect(agency.getByTestId("round").first()).toHaveAttribute("data-decision", "changes_requested");
  await expect(agency.getByTestId("round").first().getByTestId("round-effect")).toHaveAttribute("data-effect", "milestone_not_submitted");

  // The supplier delivers the milestone on the contract too, then submits round 2; the buyer approves, which releases the milestone.
  await freelancer.goto(contractUrl);
  const boxes = freelancer.getByTestId("milestone").first().getByTestId("checklist").locator('input[type="checkbox"]');
  for (let i = 0; i < (await boxes.count()); i++) await boxes.nth(i).check();
  await freelancer.getByTestId("milestone").first().locator('textarea[name="note"]').fill("Reshoot done.");
  await freelancer.getByRole("button", { name: "Send for approval" }).click();
  await expect(freelancer.getByTestId("milestone").first()).toHaveAttribute("data-status", "submitted");
  await freelancer.goto(orderUrl);
  await expect(freelancer.getByTestId("submit-form")).toContainText("No rounds left after this one");
  await freelancer.locator('[data-testid="submit-form"] textarea').fill("Round 2: reshoot delivered.");
  await freelancer.getByTestId("submit-work").click();
  await expect(freelancer.getByTestId("order-status")).toHaveAttribute("data-status", "submitted");
  await agency.goto(orderUrl);
  await expect(agency.getByTestId("order-money")).toHaveAttribute("data-headline", "awaiting_review");
  await agency.getByTestId("approve-work").click();
  await expect(agency.getByTestId("order-status")).toHaveAttribute("data-status", "approved");
  await expect(agency.getByTestId("round").nth(1).getByTestId("round-effect")).toHaveAttribute("data-effect", "milestone_approved");
  await expect(agency.getByTestId("order-money")).toHaveAttribute("data-headline", "approved_payout_initiated");
  await expect(agency.getByTestId("money-headline")).toContainText("not yet confirmed as received");
  await expect(agency.getByTestId("round").nth(1)).toHaveAttribute("data-decision", "approved");
  await freelancer.goto(contractUrl);
  await expect(freelancer.getByTestId("milestone").first()).toHaveAttribute("data-status", "released");
  await freelancer.goto("/en/studio/notifications");
  await expect(freelancer.getByTestId("notification").filter({ hasText: "approved your work" }).first()).toBeVisible();

  // The Work page lists it and the roster remembers the engagement.
  await agency.goto("/en/studio/collab/work");
  await expect(agency.getByTestId("order-row").filter({ hasText: "Menu shoot" })).toHaveAttribute("data-status", "approved");
  await expect(agency.getByTestId("order-start")).toHaveCount(0);
});
