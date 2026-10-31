import { expect, test } from "@playwright/test";
import { joinAgency, pngBuffer, uniqueHandle } from "./helpers";

// docs/65 stages 4, 7 and 8: the reminder box at sign-up, "Share → Sawwiq" into the setup, and the
// page-link rule (free until the first publish, then once, with the old link redirecting).

test("the reminder box is unticked by default and the choice shows under Account", async ({ page }) => {
  const handle = uniqueHandle("rem");
  await page.goto("/en/join");
  await expect(page.getByTestId("join-form")).toHaveAttribute("data-ready", "true");
  await expect(page.getByTestId("join-reminders")).not.toBeChecked();
  await page.fill("#name", `Agency ${handle}`);
  await page.fill("#handle", handle);
  await page.fill("#whatsapp", "0791112233");
  await page.fill("#email", `${handle}@test.jo`);
  await page.fill("#password", "password-123");
  await page.check('input[name="consent"]');
  await page.check('input[name="adult"]');
  await page.check('input[name="reminders"]');
  await page.getByRole("button", { name: "Create page" }).click();
  await page.waitForURL(/\/en\/portfolio-setup/);
  await page.goto("/en/studio/security");
  await expect(page.getByTestId("setup-reminders")).toHaveAttribute("data-state", "on");
  await page.getByTestId("setup-reminders-toggle").click();
  await expect(page.getByTestId("setup-reminders")).toHaveAttribute("data-state", "off");
});

test("pictures shared from the phone land in the setup draft", async ({ page }) => {
  await joinAgency(page, "share", { stay: true });
  const origin = new URL(page.url()).origin;
  const response = await page.request.post(`${origin}/api/share-target`, {
    multipart: {
      title: "From Photos",
      images: { name: "shot.png", mimeType: "image/png", buffer: await pngBuffer("#3b6") },
    },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(303);
  // The page opens in the page's own content language (Arabic by default).
  expect(response.headers().location).toMatch(/\/(ar|en)\/portfolio-setup\?shared=1$/);
  await page.goto(response.headers().location!);
  await expect(page.getByTestId("setup-shared-in")).toBeVisible();
  await expect(page.getByTestId("setup-media").locator("li")).toHaveCount(1);
});

test("the page link changes freely before publishing, once after it, and the old link redirects", async ({ page }) => {
  const { handle } = await joinAgency(page, "link", { stay: true });
  await page.goto("/en/studio/profile");
  await expect(page.getByTestId("handle-rule")).toHaveAttribute("data-rule", "free");
  // Publish one project from the setup.
  await page.goto("/en/portfolio-setup");
  await page.getByTestId("setup-image-input").setInputFiles({ name: "a.png", mimeType: "image/png", buffer: await pngBuffer("#a52") });
  await expect(page.getByTestId("setup-media").locator("li")).toHaveCount(1, { timeout: 30_000 });
  await page.getByTestId("setup-project-title").fill("Link test");
  await page.locator('[data-testid^="setup-service-"]').first().check({ force: true });
  await page.getByTestId("client-mode-private").check({ force: true });
  await page.getByTestId("setup-rights").check();
  await page.getByTestId("setup-publish").click();
  await expect(page.getByTestId("setup-finished")).toBeVisible();

  await page.goto("/en/studio/profile");
  await expect(page.getByTestId("handle-rule")).toHaveAttribute("data-rule", "once_left");
  const renamed = `${handle}.new`;
  await page.getByTestId("profile-handle").fill(renamed);
  await page.getByTestId("profile-form").locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.endsWith("/studio/profile"));
  await page.goto("/en/studio/profile");
  await expect(page.getByTestId("handle-rule")).toHaveAttribute("data-rule", "locked");
  await expect(page.getByTestId("profile-handle")).toHaveAttribute("readonly", "");
  // The old link still opens the page, at its new address.
  const old = await page.request.get(`/en/a/${handle}`, { maxRedirects: 0 });
  expect(old.status()).toBe(308);
  expect(old.headers().location?.endsWith(`/en/a/${renamed}`)).toBe(true);
  // Nobody else can take the old link.
  const other = await page.context().browser()!.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto("/en/join");
  await expect(otherPage.getByTestId("join-form")).toHaveAttribute("data-ready", "true");
  await otherPage.fill("#name", "Squatter");
  await otherPage.fill("#handle", handle);
  await otherPage.fill("#whatsapp", "0791112233");
  await otherPage.fill("#email", `${handle}.sq@test.jo`);
  await otherPage.fill("#password", "password-123");
  await otherPage.check('input[name="consent"]');
  await otherPage.check('input[name="adult"]');
  await otherPage.getByRole("button", { name: "Create page" }).click();
  await expect(otherPage.getByTestId("join-error-handle")).toBeVisible();
  await other.close();
});
