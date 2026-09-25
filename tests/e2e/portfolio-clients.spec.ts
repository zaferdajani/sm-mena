import { expect, test } from "@playwright/test";
import { joinAgency } from "./helpers";

// Agencies: introduction + strengths, countries served, and portfolio clients
// with the accounts the agency runs (docs/28-portfolio-clients.md).

test("demo data: a Jordanian agency that serves Saudi Arabia is listed there with a note", async ({ page, context }) => {
  await context.addCookies([{ name: "sw_country", value: "sa", url: "http://localhost" }]);
  await page.goto("/en/explore?tab=agencies");
  const row = page.getByTestId("agency-row").filter({ hasText: "@nakhla.studio" });
  await expect(row).toBeVisible();
  await expect(row.getByTestId("serves-note")).toContainText("Based in");
  await expect(row.getByTestId("serves-note")).toContainText("Saudi Arabia");
  // Saudi agencies come first.
  await expect(page.getByTestId("agency-row").first()).not.toContainText("serves");
});

test("demo data: clients tab groups accounts and work by client", async ({ page }) => {
  await page.goto("/en/a/nakhla.studio?tab=clients");
  const card = page.getByTestId("client-card").first();
  await expect(card).toBeVisible();
  await expect(card.getByTestId("client-link").first()).toHaveAttribute("href", /instagram\.com\/yasmeen\.cafe\.demo/);
  await expect(card.locator('a[href*="/p/"]').first()).toBeVisible();
  await page.goto("/en/a/nakhla.studio?tab=about");
  await expect(page.getByTestId("agency-about")).toBeVisible();
  await expect(page.getByTestId("agency-strengths").locator("li")).toHaveCount(4);
});

test("agency adds an introduction, countries served and a client with accounts", async ({ page }) => {
  const { handle } = await joinAgency(page, "clients");

  // Profile: introduction, strengths, serves the Gulf.
  await page.fill("#about", "We are a small studio for cafés.");
  await page.fill("#strengths", "Fast reels\n- Honest reports\n\n");
  await page.getByRole("button", { name: "All Gulf" }).click();
  await page.getByTestId("profile-form").getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toBeVisible();

  // Clients: one client with Instagram, a website and an extra TikTok row.
  await page.goto("/en/studio/clients");
  const form = page.getByTestId("client-form");
  await form.getByLabel("Business name").fill("Test Café");
  const rows = form.getByTestId("client-link-row");
  await rows.nth(0).locator('input[name="linkValue"]').fill("@test.cafe");
  await rows.nth(3).locator('input[name="linkValue"]').fill("testcafe.example");
  await form.getByTestId("add-account").click();
  await rows.nth(4).locator("select").selectOption("youtube");
  await rows.nth(4).locator('input[name="linkValue"]').fill("testcafe");
  // A link on the wrong network is refused with the row number.
  await rows.nth(2).locator('input[name="linkValue"]').fill("https://instagram.com/wrong");
  await form.getByRole("button", { name: "Save client" }).click();
  await expect(form.getByRole("alert")).toContainText("account 2");
  await rows.nth(2).locator('input[name="linkValue"]').fill("");
  await form.getByRole("button", { name: "Save client" }).click();
  await expect(page.getByTestId("client-item")).toContainText("Test Café");
  await expect(page.getByTestId("client-item")).toContainText("@test.cafe");

  // Public page: About shows the introduction, strengths and served countries; Clients lists the accounts.
  await page.goto(`/en/a/${handle}?tab=about`);
  await expect(page.getByTestId("agency-about")).toContainText("small studio");
  await expect(page.getByTestId("agency-strengths").locator("li")).toHaveCount(2);
  await expect(page.getByTestId("serves-note")).toContainText("Saudi Arabia");
  await page.goto(`/en/a/${handle}?tab=clients`);
  const links = page.getByTestId("client-card").getByTestId("client-link");
  await expect(links).toHaveCount(3);
  await expect(links.nth(0)).toHaveAttribute("href", "https://www.instagram.com/test.cafe");
  await expect(links.nth(1)).toHaveAttribute("href", "https://testcafe.example/");
  await expect(links.nth(2)).toHaveAttribute("href", "https://www.youtube.com/@testcafe");
});
