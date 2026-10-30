import { expect, test } from "@playwright/test";
import { uniqueHandle } from "./helpers";

// Sign-up on one screen (join-form.tsx, docs/65): the page link is suggested from the name, errors appear
// under the field in the page's language, the draft survives leaving the page (never the password), and
// the account is created by one submit.

test("one screen: a suggested link, inline errors, a draft that survives navigation, one submit", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const handle = uniqueHandle("one");
  await page.goto("/en/join");
  const form = page.getByTestId("join-form");
  await expect(form).toHaveAttribute("data-ready", "true");
  // Everything is on one screen: no step rail, the contact fields are already there.
  await expect(page.getByTestId("join-step-page")).toHaveCount(0);
  await expect(page.locator("#email")).toBeVisible();

  // Submitting an empty form shows the first problem under its field and stays on the page.
  await page.getByRole("button", { name: "Create page" }).click();
  await expect(page.getByTestId("join-error-name")).toBeVisible();
  await expect(page).toHaveURL(/\/en\/join$/);

  // The link follows the name until the person edits it.
  await page.fill("#name", `Agency ${handle}`);
  await expect(page.locator("#handle")).toHaveValue(`agency.${handle}`);
  await page.fill("#handle", handle);
  await page.fill("#name", `Agency ${handle} Co`);
  await expect(page.locator("#handle")).toHaveValue(handle);

  await page.fill("#whatsapp", "0791112233");
  await page.fill("#email", `${handle}@test.jo`);
  await page.fill("#password", "password-123");

  // Leave and come back: the answers are still there; the password is not kept anywhere.
  await page.goto("/en/examples");
  await page.goto("/en/join");
  await expect(form).toHaveAttribute("data-ready", "true");
  await expect(page.locator("#email")).toHaveValue(`${handle}@test.jo`);
  await expect(page.locator("#whatsapp")).toHaveValue("0791112233");
  await expect(page.locator("#handle")).toHaveValue(handle);
  await expect(page.locator("#password")).toHaveValue("");
  const stored = await page.evaluate(() => sessionStorage.getItem("sw:join-draft:v1") ?? "");
  expect(stored).toContain(handle);
  expect(stored).not.toContain("password-123");

  // A missing consent is explained under the box, not by the browser.
  await page.fill("#password", "password-123");
  await page.getByRole("button", { name: "Create page" }).click();
  await expect(page.getByTestId("join-error-consent")).toBeVisible();
  await page.check('input[name="consent"]');
  await page.check('input[name="adult"]');
  await page.getByRole("button", { name: "Create page" }).click();
  await page.waitForURL(/\/en\/portfolio-setup/);
  // The draft is spent once the account exists: a new visit starts clean.
  await page.goto("/en/join");
  await expect(page.getByTestId("join-form")).toHaveAttribute("data-ready", "true");
  await expect(page.locator("#name")).toHaveValue("");
});

test("Arabic on a phone: one column, no overflow, an Arabic name gets its link from the email", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const handle = uniqueHandle("ar");
  await page.goto("/ar/join");
  await expect(page.getByTestId("join-form")).toHaveAttribute("data-ready", "true");
  await page.fill("#name", "استوديو النخلة");
  await expect(page.locator("#handle")).toHaveValue("");
  await page.fill("#email", `${handle}@test.jo`);
  await expect(page.locator("#handle")).toHaveValue(handle);
  // The agent code is one line until it is needed.
  await expect(page.getByTestId("join-ref")).toHaveCount(0);
  await page.getByTestId("join-ref-open").click();
  await expect(page.getByTestId("join-ref")).toBeVisible();
  // A server-side rule is shown under its field too: a taken username (the demo agency's).
  await page.fill("#handle", "nakhla.studio");
  await page.fill("#whatsapp", "0791112233");
  await page.fill("#password", "password-123");
  await page.check('input[name="consent"]');
  await page.check('input[name="adult"]');
  await page.getByTestId("join-form").locator('button[type="submit"]').click();
  await expect(page.getByTestId("join-error-handle")).toBeVisible();
  await expect(page).toHaveURL(/\/ar\/join/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});
