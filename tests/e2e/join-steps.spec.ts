import { expect, test } from "@playwright/test";
import { nextJoinStep, uniqueHandle } from "./helpers";

// Sign-up in three steps (join-form.tsx): the rail and the fields share the screen on a laptop, a step's
// fields are checked before moving on, the draft survives leaving the page (never the password), and the
// account is created by one submit at the end.

test("steps, validation, a draft that survives navigation, and one final submit", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const handle = uniqueHandle("steps");
  await page.goto("/en/join");
  const form = page.getByTestId("join-form");
  await expect(form).toHaveAttribute("data-ready", "true");
  await expect(form).toHaveAttribute("data-step", "0");
  // On a laptop the rail sits beside the fields (two columns), not above them.
  const rail = await page.getByTestId("join-step-page").boundingBox();
  const name = await page.locator("#name").boundingBox();
  expect(rail!.x + rail!.width).toBeLessThanOrEqual(name!.x + 1);
  // Later steps' fields are not shown yet.
  await expect(page.locator("#email")).toBeHidden();

  // Continue refuses an empty step (the browser's own validity message) and stays on step 1.
  await page.getByTestId("join-next").click();
  await expect(form).toHaveAttribute("data-step", "0");

  await page.fill("#name", `Agency ${handle}`);
  await page.fill("#handle", handle);
  await nextJoinStep(page);
  await page.getByTestId("service-search").fill("SEO");
  await page.getByTestId("service-suggestion").first().click();
  await nextJoinStep(page);
  await page.fill("#whatsapp", "0791112233");
  await page.fill("#email", `${handle}@test.jo`);
  await page.fill("#password", "password-123");

  // Leave and come back: the answers and the step are still there; the password is not kept anywhere.
  await page.goto("/en/examples");
  await page.goto("/en/join");
  await expect(form).toHaveAttribute("data-ready", "true");
  await expect(form).toHaveAttribute("data-step", "2");
  await expect(page.locator("#email")).toHaveValue(`${handle}@test.jo`);
  await expect(page.locator("#whatsapp")).toHaveValue("0791112233");
  await expect(page.locator("#password")).toHaveValue("");
  const stored = await page.evaluate(() => sessionStorage.getItem("sw:join-draft:v1") ?? "");
  expect(stored).toContain(handle);
  expect(stored).not.toContain("password-123");
  await page.getByTestId("join-back").click();
  await page.getByTestId("join-back").click();
  await expect(page.locator("#name")).toHaveValue(`Agency ${handle}`);
  await expect(page.locator("#handle")).toHaveValue(handle);
  // Previously completed steps stay reachable from the rail.
  await page.getByTestId("join-step-page").click();
  await nextJoinStep(page);
  await expect(page.locator('input[name="services"][value="seo"]')).toHaveCount(1);
  await nextJoinStep(page);

  await page.fill("#password", "password-123");
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Create page" }).click();
  await page.waitForURL(/\/en\/portfolio-setup/);
  // The draft is spent once the account exists: a new visit starts clean.
  await page.goto("/en/join");
  await expect(page.getByTestId("join-form")).toHaveAttribute("data-ready", "true");
  await expect(page.getByTestId("join-form")).toHaveAttribute("data-step", "0");
  await expect(page.locator("#name")).toHaveValue("");
});

test("Arabic on a phone: compact rail, one column, no overflow, Enter moves forward", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ar/join");
  await expect(page.getByTestId("join-form")).toHaveAttribute("data-ready", "true");
  await expect(page.getByTestId("join-progress")).toBeVisible();
  await page.fill("#name", "استوديو الخطوات");
  await page.fill("#handle", uniqueHandle("ar"));
  await page.locator("#handle").press("Enter");
  await expect(page.getByTestId("join-form")).toHaveAttribute("data-step", "1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});
