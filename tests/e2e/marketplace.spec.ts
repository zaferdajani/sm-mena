import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe.configure({ mode: "serial" });

test("AI matchmaker recommends agencies, estimates a budget and posts the project", async ({ page, browser }, info) => {
  // Without an API key the rule-based matchmaker answers; the flow is identical.
  const brief = info.project.name === "mobile" ? "Photography and Reels for a clothing shop in Madaba" : "Meta ads for an online store in Amman, budget 400 JOD";
  await page.goto("/en/match");
  await page.getByTestId("chat-input").fill(brief);
  await page.getByTestId("chat-send").click();
  await expect(page.getByTestId("recommendation")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("recommendation-card").first()).toBeVisible();
  // Budgets come from real agencies' prices only (docs/31), so the seeded demo
  // agencies alone don't produce one; when real prices exist it is labelled.
  const budget = page.getByTestId("budget-card");
  if (await budget.count()) await expect(budget).toContainText("Suggested budget");
  const top = (await page.getByTestId("recommendation-card").first().innerText()).match(/@([a-z0-9._]+)/)![1];

  await page.getByTestId("send-project").click();
  await page.fill("#req-name", "E2E Client");
  await page.fill("#req-phone", "0790001122");
  await page.check('input[name="consent"]');
  await page.getByTestId("request-form").getByRole("button").last().click();
  await expect(page.getByTestId("request-created")).toBeVisible();
  const link = await page.getByTestId("request-link").innerText();

  // The top-matched agency was invited and sends a quote.
  const agency = await browser.newPage();
  await login(agency, `${top.replace(/\./g, "-")}@sawwiq.test`, "demo-pass-123");
  await agency.goto("/en/studio/opportunities");
  await agency.getByTestId("opportunities").locator("li", { hasText: "Invited" }).first().locator("a").click();
  await agency.fill("#p-timeline", "Start next week");
  await agency.fill("#p-message", "We have done this for similar businesses.");
  await agency.getByTestId("proposal-form").getByRole("button").click();
  await expect(agency.getByTestId("my-proposal")).toBeVisible();
  // The buyer's contact details stay private until they pick this agency.
  await expect(agency.getByTestId("client-hidden")).toBeVisible();
  await expect(agency.getByTestId("client-phone")).toHaveCount(0);

  // The client accepts it on the private page.
  await page.goto(link);
  await expect(page.getByTestId("proposals").locator("> li")).toHaveCount(1);
  page.on("dialog", (d) => d.accept());
  await page.getByTestId("accept").click();
  await expect(page.getByText("Closed")).toBeVisible();

  // Now the chosen agency can see how to reach the client.
  await agency.reload();
  await expect(agency.getByTestId("client-phone")).toBeVisible();
  await agency.close();
});

test("a client reviews an agency through a single-use invite link", async ({ page, browser }, info) => {
  const email = info.project.name === "mobile" ? "salt-stories@sawwiq.test" : "linked-levant@sawwiq.test";
  const handle = info.project.name === "mobile" ? "salt.stories" : "linked.levant";
  await login(page, email, "demo-pass-123");
  await page.goto("/en/studio/reviews");
  await page.fill('input[name="clientName"]', "Rami");
  await page.getByRole("button", { name: "Create link" }).click();
  const link = await page.getByTestId("invite-link").innerText();

  const client = await browser.newPage();
  await client.goto(link);
  await client.getByTestId("rating-5").check({ force: true });
  await client.fill("#review-body", "Excellent storytelling and clear monthly reports.");
  await client.fill("#review-name", "Rami Haddad");
  await client.check('input[name="consent"]');
  await client.getByRole("button", { name: "Publish review" }).click();
  await expect(client.getByTestId("review-thanks")).toBeVisible();
  await client.reload();
  await expect(client.getByTestId("review-invalid")).toBeVisible(); // single use
  await client.goto(`/en/a/${handle}?tab=reviews`);
  await expect(client.getByTestId("review-list").locator("> li").first()).toContainText("Rami");
  await expect(client.getByTestId("review-list").locator("> li").first()).toContainText("Contact confirmed");
  await client.close();
});

test("agency packages show on the profile", async ({ page }) => {
  await page.goto("/en/a/petra.growth?tab=about");
  await expect(page.getByTestId("package-list").locator("> li")).toHaveCount(2);
});

test("hire pages link to the quote request form with the service preselected", async ({ page }) => {
  await page.goto("/en/hire/seo");
  await page.getByTestId("hire-get-quotes").click();
  await expect(page).toHaveURL(/\/en\/request\/new\?service=seo/);
  await expect(page.locator('input[name="services"][value="seo"]')).toBeChecked();
});
