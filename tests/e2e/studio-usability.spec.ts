import { expect, test } from "@playwright/test";
import { joinAgency, pngBuffer } from "./helpers";

// Provider usability fixes from the staging review (2026-10-31): photos can be changed after publishing,
// the publish confirmation, the labelled work list, visibility one tap away, and the sign-up link hint.

test("an owner changes a published project's photos: remove one, add one, choose the cover", async ({ page }) => {
  await joinAgency(page, "photos");
  await page.goto("/en/studio/new");
  await page.getByTestId("image-input").setInputFiles([
    { name: "a.png", mimeType: "image/png", buffer: await pngBuffer("#b91c1c", 600, 600) },
    { name: "b.png", mimeType: "image/png", buffer: await pngBuffer("#1d4ed8", 600, 600) },
  ]);
  await page.fill("#caption", "Menu shoot for a bakery");
  await page.locator('label:has(input[name="services"])').first().click();
  await page.getByTestId("publish-button").click();
  await expect(page).toHaveURL(/\/en\/p\/[0-9a-f-]{36}\?published=1$/, { timeout: 30_000 });
  // Told it worked, with the next step.
  await expect(page.getByTestId("post-published")).toBeVisible();
  const postId = page.url().split("/p/")[1].split("?")[0];
  // A visitor never sees the owner's confirmation.
  const visitor = await (await page.context().browser()!.newContext()).newPage();
  await visitor.goto(`/en/p/${postId}?published=1`);
  await expect(visitor.getByTestId("post-published")).toHaveCount(0);

  // The work list says what it is and how to edit.
  await page.goto("/en/studio/posts");
  await expect(page.getByTestId("studio-post-title").first()).toContainText("Menu shoot for a bakery");
  await expect(page.getByTestId("posts-add-work")).toBeVisible();
  await page.getByTestId("studio-post-edit").first().click();

  // Edit: two photos; remove the first, add a new one, make the second the cover.
  const existing = page.getByTestId("post-image-existing");
  await expect(existing).toHaveCount(2);
  await existing.nth(0).getByTestId("post-image-remove").click();
  await existing.nth(1).getByTestId("post-image-make-cover").click();
  await page.getByTestId("image-input").setInputFiles({ name: "c.png", mimeType: "image/png", buffer: await pngBuffer("#15803d", 600, 600) });
  await page.getByTestId("publish-button").click();
  await expect(page.getByTestId("post-form").getByRole("status")).toBeVisible({ timeout: 30_000 });
  await page.reload();
  await expect(page.getByTestId("post-image-existing")).toHaveCount(2);

  // Removing every photo is refused with a message, not saved.
  for (const button of await page.getByTestId("post-image-remove").all()) await button.click();
  await page.getByTestId("publish-button").click();
  await expect(page.getByTestId("post-form").getByRole("alert")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("post-image-existing")).toHaveCount(2);
});

test("visibility is one tap from Studio and the profile editor, and a new account isn't called legacy", async ({ page }) => {
  await joinAgency(page, "visible");
  await expect(page.getByTestId("profile-visibility-link").getByRole("link")).toHaveAttribute("href", "/en/studio/publication");
  await page.goto("/en/studio");
  await page.getByTestId("page-status").click();
  await expect(page).toHaveURL(/\/en\/studio\/publication$/);
  await expect(page.getByTestId("publication-now")).toBeVisible();
  await expect(page.getByTestId("publication-settings")).not.toContainText("predates");
});

test("sign-up: Arabic typed into the link is explained, and the email suggests a link", async ({ page }) => {
  await page.goto("/ar/join");
  await expect(page.getByTestId("join-form")).toHaveAttribute("data-ready", "true");
  await page.fill("#name", "وكالة الريادة للتسويق");
  await expect(page.locator("#handle")).toHaveValue("");
  await page.locator("#handle").pressSequentially("الريادة");
  await expect(page.getByTestId("handle-english-only")).toBeVisible();
  await expect(page.locator("#handle")).toHaveValue("");
  await page.fill("#email", "riyada.media@test.jo");
  await expect(page.locator("#handle")).toHaveValue("riyada.media");
});
