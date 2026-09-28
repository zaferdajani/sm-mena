import { expect, test, type Page } from "@playwright/test";
import { joinAgency, login } from "./helpers";

// Collaboration V2 release 3 (docs/50): the planner drafts packages and
// coverage without booking anyone, templates and rehire start fresh drafts,
// collaborator feedback is its own class with dispute and opt-out, next
// actions and reminder preferences, and the buyer's private worksheet.

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
  await page.waitForURL(/\/en\/studio\/profile/);
  return { handle, email: `${handle}@test.jo`, password: "password-123" };
}

test.describe.configure({ mode: "serial" });

test("plan from a template, work through an order, leave feedback both ways, dispute, rehire and read the worksheet", async ({ browser }) => {
  test.setTimeout(240_000);
  const agency = await (await browser.newContext()).newPage();
  const freelancer = await (await browser.newContext()).newPage();
  const { handle: agencyHandle, email: agencyEmail } = await joinAgency(agency, "r3");
  const free = await joinFreelancer(freelancer, "r3f");

  // Next actions start empty; preferences save.
  await agency.goto("/en/studio/collab");
  await expect(agency.getByTestId("next-actions")).toHaveAttribute("data-count", "0");
  await agency.getByTestId("prefs-link").click();
  await agency.getByTestId("quiet-start").selectOption("22");
  await agency.getByTestId("quiet-end").selectOption("7");
  await agency.getByTestId("mute-availability_stale").check();
  await agency.getByTestId("prefs-submit").click();
  await expect(agency.getByTestId("prefs-saved")).toBeVisible();

  // The planner: a template fills the deliverables; the photographer role is open (no partner yet), designer is in house? No: the agency declared no roles, so both are open.
  await agency.goto("/en/studio/collab/plan");
  await agency.fill("#pl-title", "Café launch");
  await agency.getByTestId("plan-template-shoot").click();
  await agency.fill("#pl-scope", "Menu shoot and 12 posts. Call Nour on 0790001234. private: our margin is 30%");
  await expect(agency.getByTestId("plan-assistant")).toBeDisabled(); // no provider on the e2e server
  await agency.getByTestId("plan-submit").click();
  await expect(agency).toHaveURL(/\/studio\/collab\/plan\/[0-9a-f-]+/);
  await expect(agency.getByTestId("plan-view")).toHaveAttribute("data-assistant", "none");
  await expect(agency.getByTestId("plan-disclaimer")).toBeVisible();
  await expect(agency.getByTestId("plan-package")).toHaveCount(2);
  await expect(agency.getByTestId("plan-view")).not.toContainText("0790001234");
  await expect(agency.getByTestId("plan-view")).not.toContainText("30%");
  const photographerRole = agency.getByTestId("plan-role").filter({ hasText: "Photographer" });
  await expect(photographerRole).toHaveAttribute("data-kind", /candidate|unfilled/);
  await expect(agency.getByTestId("plan-sources")).toContainText("Discovery");
  const planUrl = agency.url();
  await agency.getByTestId("plan-edit").click();
  await expect(agency.locator("#pl-title")).toHaveValue("Café launch");
  // The plan with candidates at 320 and 390 CSS px, plain viewport, both locales: no sideways scroll.
  const tight = await (await browser.newContext({ viewport: { width: 320, height: 700 } })).newPage();
  await login(tight, agencyEmail, "password-123");
  for (const [w, path] of [[320, planUrl], [320, planUrl.replace("/en/", "/ar/")], [390, planUrl]] as const) {
    await tight.setViewportSize({ width: w, height: 700 });
    await tight.goto(path);
    await expect(tight.getByTestId("plan-candidate").first()).toBeVisible();
    expect(await tight.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
  await tight.close();

  // A work order through an accepted quote (no contract needed for feedback), then approval.
  await agency.goto(`/en/studio/collab?role=photographer&q=1`);
  await agency.getByTestId("provider-card").filter({ hasText: free.handle }).getByTestId("inquire-link").click();
  await agency.fill("#inq-title", "Menu shoot for feedback");
  await agency.getByRole("tab", { name: "On-site / offline" }).click();
  await agency.getByTestId("add-photo_session").click();
  await agency.fill("#inq-budget", "150");
  await agency.getByRole("button", { name: /Send to 1 provider/ }).click();
  await expect(agency).toHaveURL(/\/studio\/collab\/work\/[0-9a-f-]+\?sent=1/);
  const inquiryUrl = agency.url().replace("?sent=1", "");
  await freelancer.goto(inquiryUrl);
  await freelancer.fill("#q-amount", "150");
  await freelancer.fill("#q-scope", "30 photos.");
  await freelancer.getByRole("button", { name: "Send quote" }).click();
  await expect(freelancer.getByTestId("quote-sent")).toBeVisible();
  await agency.goto(inquiryUrl);
  await agency.getByTestId("quote-accept").click();
  await expect(agency.getByTestId("handoff-waiting")).toBeVisible();
  await agency.getByTestId("handoff-order").click();
  await agency.fill("#rev", "1");
  await agency.getByRole("button", { name: "Offer to the supplier" }).click();
  await expect(agency).toHaveURL(/\/studio\/collab\/orders\/[0-9a-f-]+$/);
  const orderUrl = agency.url();
  // Next actions now show the freelancer an offer to answer; the buyer nothing yet.
  await freelancer.goto("/en/studio/collab");
  await expect(freelancer.getByTestId("next-action").filter({ hasText: "Answer a work order offer" })).toHaveCount(1);
  // On a plain 320/390 viewport (no mobile emulation, which hides overflow) a real title must not widen the page.
  const narrow = await (await browser.newContext({ viewport: { width: 320, height: 700 } })).newPage();
  await login(narrow, free.email, free.password);
  for (const path of ["/en/studio/collab", "/ar/studio/collab"]) {
    await narrow.goto(path);
    await expect(narrow.getByTestId("next-action").first()).toBeVisible();
    expect(await narrow.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
  await narrow.setViewportSize({ width: 390, height: 844 });
  await narrow.goto("/en/studio/collab");
  expect(await narrow.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await narrow.close();
  await freelancer.goto(orderUrl);
  await freelancer.getByTestId("order-accept").click();
  await expect(freelancer.getByTestId("order-status")).toHaveAttribute("data-status", "accepted");
  await freelancer.locator('[data-testid="submit-form"] textarea').fill("Photos in the folder.");
  await freelancer.getByTestId("submit-work").click();
  await agency.goto("/en/studio/collab");
  await expect(agency.getByTestId("next-action").filter({ hasText: "Review submitted work" })).toHaveCount(1);
  await agency.goto(orderUrl);
  await agency.getByTestId("approve-work").click();
  await expect(agency.getByTestId("order-status")).toHaveAttribute("data-status", "approved");

  // Feedback: buyer public, supplier parties-only; a retry does not duplicate; the public page shows only the public one.
  await expect(agency.getByTestId("order-feedback")).toBeVisible();
  await agency.getByTestId("fb-communication-5").check({ force: true });
  await agency.getByTestId("fb-reliability-4").check({ force: true });
  await agency.getByTestId("fb-quality-5").check({ force: true });
  await agency.fill("#fb-body", "Great light, on time.");
  await agency.getByTestId("fb-public").check({ force: true });
  await agency.getByTestId("feedback-submit").click();
  await expect(agency.getByTestId("feedback-record").filter({ hasText: "Your feedback" })).toHaveCount(1);
  await expect(agency.getByTestId("feedback-form")).toHaveCount(0);
  await freelancer.goto(orderUrl);
  await expect(freelancer.getByTestId("feedback-record").filter({ hasText: "Great light" })).toBeVisible();
  await freelancer.getByTestId("fb-communication-4").check({ force: true });
  await freelancer.getByTestId("fb-reliability-5").check({ force: true });
  await freelancer.getByTestId("fb-quality-4").check({ force: true });
  await freelancer.fill("#fb-body", "Clear brief.");
  await freelancer.getByTestId("feedback-submit").click();
  await expect(freelancer.getByTestId("feedback-record")).toHaveCount(2);
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(`/en/a/${free.handle}?tab=reviews`);
  await expect(visitor.getByTestId("collaborator-feedback")).toHaveAttribute("data-count", "1");
  await expect(visitor.getByTestId("collaborator-feedback")).toContainText("Great light, on time.");
  await expect(visitor.getByTestId("collaborator-feedback")).not.toContainText("Menu shoot");
  await visitor.goto(`/en/a/${agencyHandle}?tab=reviews`);
  await expect(visitor.getByTestId("collaborator-feedback")).toHaveCount(0); // parties-only
  // The freelancer disputes it: gone from the public page; staff sees it first in Admin → Reviews.
  await freelancer.getByTestId("dispute-open").click();
  await freelancer.getByTestId("dispute-note").fill("The light was the client's choice.");
  await freelancer.getByTestId("dispute-submit").click();
  // The page re-renders from the server: the record now carries the disputed state.
  await expect(freelancer.getByTestId("feedback-record").filter({ hasText: "Great light" })).toHaveAttribute("data-status", "disputed");
  await visitor.goto(`/en/a/${free.handle}?tab=reviews`);
  await expect(visitor.getByTestId("collaborator-feedback")).toHaveCount(0);
  const admin = await (await browser.newContext()).newPage();
  await login(admin, "admin@sawwiq.test", "admin-pass-123");
  await admin.goto("/en/admin/reviews");
  const row = admin.getByTestId("admin-collab-feedback-row").filter({ hasText: "Great light" }).filter({ hasText: free.handle });
  await expect(row).toHaveAttribute("data-status", "disputed");
  await expect(row.getByTestId("collab-feedback-publish")).toBeVisible(); // staff may publish or hide a disputed record
  await row.getByTestId("collab-feedback-moderate").click(); // "Hide": stays out of public view
  await expect(admin.getByTestId("admin-collab-feedback-row").filter({ hasText: "Great light" }).filter({ hasText: free.handle })).toHaveAttribute("data-status", "hidden");

  // Rehire: a fresh inquiry draft with deliverables and scope only; the worksheet lists the accepted quote.
  await agency.goto("/en/studio/collab/work");
  await agency.getByTestId("order-rehire").first().click();
  await expect(agency).toHaveURL(/\/studio\/collab\/work\/new\?rehire=/);
  await expect(agency.getByTestId("inquiry-prefill")).toHaveAttribute("data-from", "rehire");
  await expect(agency.locator("#inq-title")).toHaveValue("Menu shoot for feedback");
  await expect(agency.locator("#inq-budget")).toHaveValue("");
  await expect(agency.locator("#inq-from")).toHaveValue("");
  await expect(agency.getByTestId("recipient-toggle").filter({ hasText: free.handle })).toHaveAttribute("aria-pressed", "true");
  await agency.goto("/en/studio/collab/work/new?template=reels");
  await expect(agency.getByTestId("inquiry-prefill")).toHaveAttribute("data-from", "template");
  await expect(agency.locator("#inq-title")).toHaveValue("Reels day");
  await agency.goto("/en/studio/collab/worksheet");
  await expect(agency.getByTestId("worksheet-line").filter({ hasText: "Menu shoot for feedback" })).toHaveAttribute("data-amount", "150000");
  await expect(agency.getByTestId("worksheet-note")).toContainText("not signed amounts");
  const res = await freelancer.goto("/en/studio/collab/worksheet");
  expect(res?.status()).toBe(200);
  await expect(freelancer.getByTestId("collab-empty")).toBeVisible(); // nothing of the buyer's leaks
});

test("Arabic on a phone: the planner and the worksheet render without overflow", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await login(page, "nakhla-studio@sawwiq.test", "demo-pass-123");
  for (const path of ["/ar/studio/collab/plan", "/ar/studio/collab/worksheet", "/ar/studio/collab/preferences"]) {
    await page.goto(path);
    await expect(page.getByTestId("collab-tabs")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
});

test("the intelligence switch: coming soon on the planner, off hides it; work orders keep working", async ({ browser, isMobile }) => {
  test.skip(Boolean(isMobile), "switch state is global; covered once on desktop");
  const admin = await (await browser.newContext()).newPage();
  await login(admin, "admin@sawwiq.test", "admin-pass-123");
  const agency = await (await browser.newContext()).newPage();
  await login(agency, "nakhla-studio@sawwiq.test", "demo-pass-123");
  const setState = async (state: "on" | "soon" | "off") => {
    await admin.goto("/en/admin/features");
    await admin.getByTestId(`feature-collaboration_intelligence-${state}`).check({ force: true });
    await admin.getByTestId("feature-collaboration_intelligence-save").click();
    await admin.waitForLoadState("networkidle");
    await admin.reload();
    await expect(admin.getByTestId(`feature-collaboration_intelligence-${state}`)).toBeChecked();
  };
  try {
    await setState("soon");
    await agency.goto("/en/studio/collab/plan");
    await expect(agency.getByTestId("coming-soon")).toHaveAttribute("data-feature", "collaboration_intelligence");
    await agency.goto("/en/studio/collab");
    await expect(agency.getByTestId("next-actions")).toHaveCount(0);
    await expect(agency.getByTestId("collab-tab-plan")).toHaveCount(0);
    await setState("off");
    expect((await agency.goto("/en/studio/collab/worksheet"))?.status()).toBe(404);
    await agency.goto("/en/studio/collab/work");
    await expect(agency.getByTestId("collab-work")).toBeVisible();
    await expect(agency.getByTestId("work-templates")).toHaveCount(0);
  } finally {
    await setState("on");
  }
});
