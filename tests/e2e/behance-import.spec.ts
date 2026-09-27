import { expect, test } from "@playwright/test";
import { joinAgency } from "./helpers";

// Studio → Import from Behance (docs/47-behance-import.md). The e2e server reads
// saved Behance pages (BEHANCE_FIXTURES), so no network and no real profile.
test("a provider pulls its Behance projects into posts, with a credit link on each", async ({ page }) => {
  test.setTimeout(120_000);
  const { handle } = await joinAgency(page, "bhnc");
  await page.goto("/en/studio/new");
  await page.getByTestId("behance-import-link").click();
  await expect(page).toHaveURL(/\/en\/studio\/import\/behance/);

  // A wrong link is refused with a clear message.
  await page.getByTestId("behance-input").fill("https://dribbble.com/someone");
  await page.getByTestId("behance-read").click();
  await expect(page.getByTestId("behance-error")).toContainText("doesn't look like a Behance");

  await page.getByTestId("behance-input").fill("behance.net/sawwiqdemo");
  await page.getByTestId("behance-read").click();
  const review = page.getByTestId("behance-review");
  await expect(review).toBeVisible({ timeout: 30_000 });
  // The saved profile links to sawwiq.org/a/demo.studio, not to this new agency.
  await expect(page.getByTestId("behance-ownership")).toHaveAttribute("data-ownership", "unverified");
  const drafts = review.getByTestId("behance-draft");
  await expect(drafts).toHaveCount(2);
  await expect(drafts.first()).toContainText("Rose Boutique");
  await expect(drafts.first().getByTestId("behance-client")).toHaveValue("Rose Boutique");
  await expect(drafts.first().getByTestId("behance-images").locator("button")).toHaveCount(2);

  // Keep the first project only, trim it to one image, and publish.
  await drafts.nth(1).getByTestId("behance-include").uncheck();
  await drafts.first().getByTestId("behance-images").locator("button").nth(1).click();
  await expect(drafts.first()).toContainText("1 of 2 images kept");
  await expect(page.getByTestId("behance-publish")).toContainText("Publish 1 post");
  await page.getByTestId("behance-publish").click();
  await expect(page.getByTestId("behance-done")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("behance-done")).toContainText("1 post published");

  // The post is on the page, filed under its client (an account tile), and credits the Behance project.
  await page.goto(`/en/a/${handle}`);
  await expect(page.getByTestId("post-count")).toHaveText("1");
  await expect(page.getByTestId("account-tile")).toHaveCount(1);
  await page.getByTestId("account-tile").click();
  await expect(page).toHaveURL(/\/en\/a\/[^/]+\/c\//);
  await page.locator('a[href*="/en/p/"]').first().click();
  await expect(page).toHaveURL(/\/en\/p\//);
  await expect(page.getByTestId("post-source")).toHaveAttribute("href", "https://www.behance.net/gallery/101/rose-boutique-branding");
  await expect(page.getByTestId("post-client")).toContainText("Rose Boutique");
});

test("the bookmarklet path: a Behance tab hands its page to the import tab", async ({ page }) => {
  test.setTimeout(120_000);
  await joinAgency(page, "bhoff");
  await page.goto("/en/studio/import/behance?handoff=1");
  await expect(page.getByTestId("behance-waiting")).toBeVisible();
  await expect(page.getByTestId("behance-bookmarklet-link")).toHaveAttribute("href", /^javascript:/);
  // What the bookmarklet would post from behance.net: the page's JSON state and Open Graph tags.
  const html = (await import("node:fs")).readFileSync("tests/fixtures/behance/project-101.html", "utf8");
  const blobs = [...html.matchAll(/<script[^>]+type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  await page.evaluate(
    ({ blobs }) => {
      window.dispatchEvent(new MessageEvent("message", { origin: "https://www.behance.net", data: { type: "sawwiq-behance-page", url: "https://www.behance.net/gallery/101/rose-boutique-branding", blobs, meta: { title: "Rose Boutique | Branding on Behance" } } }));
    },
    { blobs },
  );
  const review = page.getByTestId("behance-review");
  await expect(review).toBeVisible({ timeout: 30_000 });
  await expect(review.getByTestId("behance-draft")).toHaveCount(1);
  await expect(review.getByTestId("behance-draft").first()).toContainText("Rose Boutique");
  // A message from any other origin is ignored.
  await page.goto("/en/studio/import/behance?handoff=1");
  await page.evaluate(({ blobs }) => {
    window.dispatchEvent(new MessageEvent("message", { origin: "https://evil.example.com", data: { type: "sawwiq-behance-page", url: "https://www.behance.net/gallery/101/x", blobs, meta: {} } }));
  }, { blobs });
  await page.waitForTimeout(1500);
  await expect(page.getByTestId("behance-review")).toHaveCount(0);
});
