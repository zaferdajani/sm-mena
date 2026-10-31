import { expect, test } from "@playwright/test";
import { joinAgency } from "./helpers";

// "Make your page stronger" (docs/65 stage 3): the first service card and the two basics live on the
// packages page, each a short form of its own; the full package form stays one tap away.

test("the first service card becomes a package and the basics land on the page", async ({ page }) => {
  const { handle } = await joinAgency(page, "strength");
  await page.goto("/en/studio/packages");
  const card = page.getByTestId("first-service-card");
  await expect(card).toBeVisible();
  // The full form is folded while the page has no package yet.
  await expect(page.getByTestId("full-package-form")).toBeVisible();
  await expect(page.getByTestId("package-form")).toBeHidden();
  await page.getByTestId("first-service").selectOption("photography");
  await page.getByTestId("first-price").fill("150");
  await page.getByTestId("first-delivery").fill("7");
  await page.getByTestId("first-billing-monthly").check({ force: true });
  await page.getByTestId("first-service-save").click();
  // Saved as an ordinary package named after the service, shown as a short card; the first card steps aside.
  await expect(page.getByTestId("package-card")).toContainText("Photography");
  await page.getByTestId("package-card").first().locator("> summary").click();
  await expect(page.getByTestId("package-form").first()).toBeVisible();
  await expect(page.getByTestId("package-form").first().locator('input[name="title"]')).toHaveValue("Photography");
  await expect(page.getByTestId("package-form").first().locator('input[name="priceJod"]')).toHaveValue("150");
  await expect(page.getByTestId("package-form").first().locator('select[name="billing"]')).toHaveValue("monthly");
  await expect(page.getByTestId("first-service-card")).toHaveCount(0);

  const basics = page.getByTestId("page-basics");
  await expect(basics).toBeVisible();
  await page.getByTestId("basics-team").selectOption("2-5");
  await page.getByTestId("basics-min").fill("300");
  await page.getByTestId("basics-save").click();
  await expect(page.getByTestId("page-basics")).toHaveCount(0);
  await page.goto("/en/studio/profile");
  await expect(page.locator("#teamSize")).toHaveValue("2-5");
  await expect(page.locator("#startingPriceJod")).toHaveValue("300");
  // The Studio's checklist counts the price step as done now.
  await page.goto("/en/studio");
  await expect(page.getByTestId("page-step-price")).toHaveAttribute("data-done", "true");
  expect(handle).toBeTruthy();
});
