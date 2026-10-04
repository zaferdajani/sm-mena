import { expect, test } from "@playwright/test";
import { joinAgency, pngBuffer } from "./helpers";

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
  // The agency's own channels are badges in the header: the seeded TikTok and YouTube plus the older Instagram field.
  const socials = page.getByTestId("profile-socials");
  await expect(socials.getByTestId("social-tiktok")).toHaveAttribute("href", "https://www.tiktok.com/@nakhla_studio");
  await expect(socials.getByTestId("social-youtube")).toHaveAttribute("href", "https://www.youtube.com/@nakhla_studio");
  await expect(socials.getByTestId("social-instagram")).toHaveAttribute("href", /instagram\.com\/nakhla_studio/);
  await expect(page.getByTestId("share-profile")).toBeVisible();
  const card = page.getByTestId("client-card").first();
  await expect(card).toBeVisible();
  await expect(card.getByTestId("managed-chip")).toHaveText("Managed account");
  await expect(card.getByTestId("share-client")).toBeVisible();
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
  // The agency's own channels: TikTok and YouTube rows; a link on the wrong network is refused.
  const social = page.getByTestId("social-link-row");
  await social.nth(0).locator('input[name="socialValue"]').fill(`@${handle}.tok`);
  await social.nth(1).locator('input[name="socialValue"]').fill("https://instagram.com/not-youtube");
  await page.getByTestId("profile-form").getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("profile-form").getByRole("alert")).toContainText("channel");
  await social.nth(1).locator('input[name="socialValue"]').fill(`https://www.youtube.com/@${handle}`);
  await page.getByTestId("profile-form").getByRole("button", { name: "Save" }).click();
  // Wait for the actual save redirect, not the always-visible demo/live-region status.
  await expect(page).toHaveURL(/\/en\/studio\/packages\?welcome=1$/);

  // Clients: one client with Instagram, a website and an extra TikTok row.
  await page.goto("/en/studio/clients");
  const form = page.getByTestId("client-form");
  await form.getByLabel("Business name", { exact: true }).fill("Test Café");
  await form.getByTestId("client-logo-input").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: await pngBuffer("#be123c", 400, 400) });
  await expect(form.getByTestId("client-logo-preview")).toBeVisible();
  const rows = form.getByTestId("client-link-row");
  // The account handle is unique per run: earlier runs' confirmations stay in the database.
  const ig = `cafe.${handle.replace(/[^a-z0-9.]/g, "")}`;
  await rows.nth(0).locator('input[name="linkValue"]').fill(`@${ig}`);
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
  await expect(page.getByTestId("client-item")).toContainText(`@${ig}`);
  await expect(page.getByTestId("client-item").getByTestId("client-logo")).toBeVisible();

  // A post filed under the account, and a standalone one.
  for (const [caption, account] of [["Café reels for Test Café", "Test Café"], ["A standalone shoot", ""]] as const) {
    await page.goto("/en/studio/new");
    await page.getByTestId("image-input").setInputFiles({ name: "one.png", mimeType: "image/png", buffer: await pngBuffer("#1d4ed8", 900, 900) });
    await page.fill("#caption", caption);
    await page.locator('input[name="services"][value="photography"]').check({ force: true }); // a new agency lists no service yet
    if (account) await page.selectOption("#clientId", { label: account });
    await page.getByTestId("publish-button").click();
    await expect(page).toHaveURL(/\/en\/p\//, { timeout: 30_000 });
  }
  // The post page names the account, with its logo, and opens it.
  await expect(page.getByTestId("post-client")).toHaveCount(0); // the standalone post
  await page.goto(`/en/a/${handle}`);
  // Header: the channels as badges opening the live accounts, and Share profile (no share sheet here, so the text and link are copied).
  const socials = page.getByTestId("profile-socials");
  await expect(socials.getByTestId("social-tiktok")).toHaveAttribute("href", `https://www.tiktok.com/@${handle}.tok`);
  await expect(socials.getByTestId("social-youtube")).toHaveAttribute("href", `https://www.youtube.com/@${handle}`);
  await expect(socials.getByTestId("social-youtube")).toHaveAttribute("target", "_blank");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByTestId("share-profile").click();
  await expect(page.getByTestId("share-profile-status")).toHaveText("Link copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(`/en/a/${handle}`);
  await expect(page.getByTestId("share-profile-whatsapp")).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=/);
  // Work tab: the account as one tile (its two-post group), then the standalone post.
  const tile = page.getByTestId("account-tile");
  await expect(tile).toHaveCount(1);
  await expect(tile).toContainText("Test Café");
  await expect(tile).toContainText("1 post");
  await expect(page.getByTestId("post-grid").locator("a")).toHaveCount(1);
  await tile.click();
  await expect(page).toHaveURL(/\/en\/a\/.+\/c\/[0-9a-f-]{36}$/);
  const account = page.getByTestId("account-page");
  await expect(account).toContainText("Test Café");
  await expect(account.getByTestId("account-logo")).toBeVisible();
  await expect(account.getByTestId("client-link")).toHaveCount(3);
  // Proof of work: the "Managed account" chip, badges that name the network and the handle and open the live profiles, and Share client portfolio.
  await expect(account.getByTestId("managed-chip")).toHaveText("Managed account");
  const channels = account.getByTestId("account-channels");
  await expect(channels.getByTestId("client-link").nth(0)).toContainText("Instagram");
  await expect(channels.getByTestId("client-link").nth(0)).toContainText(`@${ig}`);
  await expect(channels.getByTestId("client-link").nth(0)).toHaveAttribute("target", "_blank");
  await account.getByTestId("share-client").click();
  await expect(account.getByTestId("share-client-status")).toHaveText("Link copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(new RegExp(`^Check out Agency ${handle}'s work and managed channels for Test Café on Sawwiq http://localhost:\\d+/en/a/${handle}/c/[0-9a-f-]{36}$`));
  await expect(account.getByTestId("post-grid").locator("a")).toHaveCount(1);
  await account.getByTestId("post-grid").locator("a").first().click();
  await expect(page.getByTestId("post-client")).toContainText("For Test Café");
  await expect(page.getByTestId("post-client")).toHaveAttribute("href", /\/c\/[0-9a-f-]{36}$/);

  // Behind the Page (docs/28): the confirmation link, the client's tap, the badge, "who runs this page?", the card.
  await page.goto("/en/studio/clients");
  await page.getByTestId("confirm-link-button").click();
  const confirmUrl = await page.getByTestId("confirm-link").innerText();
  expect(confirmUrl).toMatch(/\/en\/confirm-account\/[\w-]+$/);
  await page.goto(`/en/who-runs?q=@${ig}`);
  await expect(page.getByTestId("who-runs-none")).toBeVisible(); // not confirmed yet
  await page.goto(confirmUrl);
  await expect(page.getByTestId("confirm-page")).toContainText("Test Café");
  await page.getByTestId("confirm-yes").click();
  await expect(page.getByTestId("confirm-done")).toBeVisible();
  await page.goto(`/en/who-runs?q=https://instagram.com/${ig}`);
  await expect(page.getByTestId("who-runs-hit")).toHaveCount(1);
  await expect(page.getByTestId("who-runs-hit")).toContainText("Confirmed by the client");
  await page.goto(`/en/a/${handle}`);
  await expect(page.getByTestId("member-no")).toContainText("Member No.");
  // The first 100 seats are the founding cohort (docs/39); later seats on a long-lived database are not.
  const seatNo = Number((await page.getByTestId("member-no").innerText()).replace(/\D/g, ""));
  await expect(page.getByTestId("founding-badge")).toHaveCount(seatNo <= 100 ? 1 : 0);
  await page.goto("/en/studio");
  await expect(page.getByTestId("share-card-preview")).toBeVisible();
  await expect(page.getByTestId("behind-card").first()).toContainText("I'm the one behind the page");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("share-card-download").click()]);
  expect(download.suggestedFilename()).toBe(`sawwiq-${handle}.png`);
  await page.goto("/en/sawwiq50");
  await expect(page.getByTestId("top-row").filter({ hasText: `Agency ${handle}` })).toHaveCount(1); // one confirmed account puts it on the list

  // Public page: About shows the introduction, strengths and served countries; Clients lists the accounts.
  await page.goto(`/en/a/${handle}?tab=about`);
  await expect(page.getByTestId("agency-about")).toContainText("small studio");
  await expect(page.getByTestId("agency-strengths").locator("li")).toHaveCount(2);
  await expect(page.getByTestId("serves-note")).toContainText("Saudi Arabia");
  await page.goto(`/en/a/${handle}?tab=clients`);
  await expect(page.getByTestId("client-open")).toHaveAttribute("href", /\/c\/[0-9a-f-]{36}$/);
  await expect(page.getByTestId("client-confirmed")).toBeVisible();
  const links = page.getByTestId("client-card").getByTestId("client-link");
  await expect(links).toHaveCount(3);
  await expect(links.nth(0)).toHaveAttribute("href", `https://www.instagram.com/${ig}`);
  await expect(links.nth(1)).toHaveAttribute("href", "https://testcafe.example/");
  await expect(links.nth(2)).toHaveAttribute("href", "https://www.youtube.com/@testcafe");
});
