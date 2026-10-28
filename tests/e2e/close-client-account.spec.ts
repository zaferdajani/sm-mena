import { expect, test } from "@playwright/test";
import { signInClient } from "./helpers";

// Owner request: every account can be closed. A business owner (code sign-in,
// no password) closes theirs from Saved by typing their email; the email can't
// sign in again until support reopens it (docs/08).
test("a business owner closes their account and cannot sign in with it again", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const email = await signInClient(page);
  await page.goto("/ar/saved");
  const box = page.getByTestId("close-client-account");
  await expect(box).toContainText("إغلاق حسابي");
  await box.getByTestId("close-client-open").click();
  await box.getByTestId("close-client-email").fill("someone-else@test.jo");
  await box.getByTestId("close-client-submit").click();
  await expect(box.getByTestId("close-client-error")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  await box.getByTestId("close-client-email").fill(email);
  await box.getByTestId("close-client-submit").click();
  await expect(page).toHaveURL(/\/ar\/signin\?closed=1/);
  await expect(page.getByTestId("account-closed")).toContainText("تم إغلاق حسابك");

  // Signed out, and the same email is refused.
  await page.goto("/en/saved");
  await expect(page.getByTestId("saved-sign-in")).toBeVisible();
  await page.goto("/en/signin");
  await page.fill("#email", email);
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Send the code" }).click();
  await expect(page.getByText("This account was closed. To reopen it, contact support.")).toBeVisible();
});
