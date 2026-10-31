import { expect, test } from "@playwright/test";
import { joinAgency, pngBuffer } from "./helpers";

// Visitor paths from the usability review (2026-10-31): a next step wherever a visitor looks.

test("a visitor can ask about a package, the work for a client, and a post, without going back up the page", async ({ page, browser }) => {
  test.setTimeout(150_000);
  const { handle } = await joinAgency(page, "paths");
  await page.goto("/en/studio/packages");
  // The first package's full form starts folded under the quick first-service card.
  await page.getByTestId("full-package-form").locator("> summary").click();
  const form = page.getByTestId("package-form").last();
  await form.locator('input[name="title"]').fill("Bakery Starter");
  await form.locator('select[name="service"]').selectOption({ index: 1 });
  await form.locator('input[name="priceJod"]').fill("250");
  await form.getByTestId("add-reels").click();
  await form.getByRole("button", { name: "Add package" }).click();
  await expect(page.getByTestId("package-contract")).toBeVisible();
  await page.goto("/en/studio/clients");
  await page.getByTestId("client-form").getByLabel("Business name", { exact: true }).fill("Crumbs Bakery");
  await page.getByTestId("client-form").getByRole("button", { name: "Save client" }).click();
  await page.getByTestId("client-add-work").click();
  await page.getByTestId("image-input").setInputFiles({ name: "w.png", mimeType: "image/png", buffer: await pngBuffer("#9a3412", 900, 900) });
  await page.fill("#caption", "Morning bread reels for Crumbs Bakery");
  await page.locator('label:has(input[name="services"])').first().click();
  await page.getByTestId("publish-button").click();
  await expect(page).toHaveURL(/\/en\/p\//, { timeout: 30_000 });
  const postUrl = page.url();
  // The owner doesn't get "ask" buttons on their own work.
  await expect(page.getByTestId("post-ask")).toHaveCount(0);

  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(`/en/a/${handle}?tab=about`);
  await visitor.getByTestId("package-ask").first().click();
  await expect(visitor.locator("#inq-message")).toHaveValue(/Bakery Starter/);
  await visitor.keyboard.press("Escape");

  await visitor.goto(postUrl);
  await visitor.getByTestId("post-ask").click();
  await expect(visitor.locator("#inq-message")).toHaveValue(/similar/);
  await visitor.keyboard.press("Escape");

  await visitor.getByTestId("post-client").click();
  await expect(visitor.getByTestId("account-page")).toContainText("Crumbs Bakery");
  await visitor.getByTestId("account-contact").click();
  await expect(visitor.locator("#inq-message")).toHaveValue(/Crumbs Bakery/);
});

test("sign-in from a like explains why and leads back", async ({ page }) => {
  await page.goto("/en/signin?next=%2Fen%2Fexplore");
  await expect(page.getByTestId("signin-why")).toBeVisible();
  await page.getByTestId("signin-back").click();
  await expect(page).toHaveURL(/\/en\/explore$/);
});

test("searching a business type or the site's own words finds the matching agencies", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "sw_demo", value: "1", url: baseURL! }]);
  for (const q of ["مخبز", "bakery", "سوشال"]) {
    await page.goto(`/ar/explore?tab=agencies&q=${encodeURIComponent(q)}`);
    await expect(page.getByTestId("explore-agency-card").first(), q).toBeVisible();
  }
});

test("the release stamp is quiet text, not a link to raw data", async ({ page }) => {
  await page.goto("/ar/explore");
  const stamp = page.getByTestId("release-stamp").first();
  await expect(stamp).toHaveAttribute("data-release-environment", /.+/);
  expect(await stamp.evaluate((el) => el.tagName)).toBe("SPAN");
});
