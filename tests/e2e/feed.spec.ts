import { expect, test } from "@playwright/test";

// The feed (docs/38-feed.md): business-type tags and chips everywhere; phones get
// the full-screen swipe feed, desktops the card list.

test("business-type chips filter the feed, and every post shows its type", async ({ page }) => {
  await page.goto("/ar/feed");
  await expect(page.getByTestId("business-type-bar")).toBeVisible();
  await expect(page.getByTestId("business-tag").first()).toBeVisible();
  await page.getByTestId("type-restaurant_cafe").click();
  await expect(page).toHaveURL(/type=restaurant_cafe/);
  await expect(page.getByTestId("type-restaurant_cafe")).toHaveAttribute("aria-current", "page");
  // Sponsored posts included: paid placement never shows another type here.
  const tags = page.getByTestId("business-tag");
  await expect(tags.first()).toContainText("مطاعم ومقاهي");
  for (const text of await tags.allInnerTexts()) expect(text).toContain("مطاعم ومقاهي");
  await page.getByTestId("type-all").click();
  await expect(page).not.toHaveURL(/type=/);
});

test("phones get one post per screen that snaps, with a swipe hint", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "the swipe feed is for phones");
  await page.goto("/ar/feed");
  await expect(page.getByTestId("reel-feed")).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/reel-snap/);
  const first = page.getByTestId("post-card").first();
  await expect(first).toHaveAttribute("data-reel", "");
  // Each post fills the space between the header bars.
  const box = (await first.boundingBox())!;
  expect(box.height).toBeGreaterThan((page.viewportSize()!.height) * 0.6);
  await expect(page.getByTestId("reel-hint")).toBeVisible();
  await page.getByTestId("post-card").nth(1).evaluate((e) => e.scrollIntoView());
  await expect(page.getByTestId("reel-hint")).toHaveCount(0);
  // Double-tap likes.
  const second = page.getByTestId("post-card").nth(1);
  const like = second.getByTestId("like-button");
  if ((await like.getAttribute("aria-pressed")) === "false") {
    await second.locator("img").nth(1).dblclick();
    await expect(like).toHaveAttribute("aria-pressed", "true");
  }
});

test("desktops keep the card list", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "phones get the swipe feed");
  await page.goto("/en/feed");
  await expect(page.getByTestId("reel-feed")).toHaveCount(0);
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await expect(page.getByTestId("post-card").first()).not.toHaveAttribute("data-reel", "");
});
