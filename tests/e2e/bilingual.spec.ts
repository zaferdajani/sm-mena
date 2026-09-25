import { expect, test } from "@playwright/test";
import { uniqueHandle } from "./helpers";

test("an agency writes its page in Arabic and English; each reader sees their language", async ({ page }) => {
  const handle = uniqueHandle();
  await page.goto("/en/join");
  await page.fill("#name", "استوديو ثنائي");
  await page.fill("#handle", handle);
  await page.fill("#whatsapp", "0791112233");
  await page.fill("#email", `${handle}@test.jo`);
  await page.fill("#password", "password-123");
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Create page" }).click();
  await expect(page).toHaveURL(/\/en\/studio\/profile\?welcome=1/);

  await page.fill("#bio", "محتوى عربي للمطاعم");
  const other = page.getByTestId("other-language");
  await other.locator("summary").click();
  await page.fill("#tr_name", "Duo Studio");
  await page.fill("#tr_bio", "English content for restaurants");
  await page.getByTestId("profile-form").locator('button[type="submit"]').click();
  await expect(page.getByText("Page saved.")).toBeVisible();

  await page.goto(`/en/a/${handle}`);
  await expect(page.locator("h1")).toContainText("Duo Studio");
  await expect(page.getByText("English content for restaurants")).toBeVisible();

  await page.goto(`/ar/a/${handle}`);
  await expect(page.locator("h1")).toContainText("استوديو ثنائي");
  await expect(page.getByText("محتوى عربي للمطاعم")).toBeVisible();

  // Switching the main language swaps the texts, so each stays in its own language.
  await page.goto("/en/studio/profile");
  await page.locator('label:has([data-testid="content-lang-en"])').click();
  await expect(page.locator("#name")).toHaveValue("Duo Studio");
  await expect(page.locator("#tr_name")).toHaveValue("استوديو ثنائي");
  await page.getByTestId("profile-form").locator('button[type="submit"]').click();
  await expect(page.getByText("Page saved.")).toBeVisible();
  await page.goto(`/ar/a/${handle}`);
  await expect(page.locator("h1")).toContainText("استوديو ثنائي");
  await page.goto(`/en/a/${handle}`);
  await expect(page.locator("h1")).toContainText("Duo Studio");
});
