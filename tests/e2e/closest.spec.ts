import { expect, test } from "@playwright/test";

// A search with no exact match says so, then shows the closest agencies with
// their match percentage and what differs (docs/35-closest-matches.md).
test("explore shows the closest agencies when nothing matches every filter", async ({ page }) => {
  await page.goto("/en/explore?tab=agencies&service=seo&city=aqaba&max=20&platforms=snapchat");
  const closest = page.getByTestId("closest");
  await expect(closest).toContainText("No exact matches");
  const first = closest.getByTestId("closest-agency").first();
  await expect(first).toBeVisible();
  await expect(first.getByTestId("match-percent")).toContainText("% match");
  await expect(first.getByTestId("match-differences").locator("li").first()).toBeVisible();
  // The gaps are named, e.g. the budget or the city.
  await expect(closest.getByTestId("match-differences").first()).toContainText(/over your maximum|not Aqaba|Doesn't list|Doesn't offer|Hasn't published/);
});

test("a hire page with no agency in that city suggests the closest ones", async ({ page }) => {
  await page.goto("/en/hire/seo/aqaba");
  const closest = page.getByTestId("closest");
  await expect(closest).toBeVisible();
  await expect(closest.getByTestId("closest-agency").first().getByTestId("match-percent")).toBeVisible();
  await expect(closest.getByTestId("match-differences").first()).toContainText(/not Aqaba|Offers/);
});
