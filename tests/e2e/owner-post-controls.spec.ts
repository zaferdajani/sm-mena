import { expect, test } from "@playwright/test";
import { DEMO_AGENCY, login } from "./helpers";

// Staging feedback (2026-10-29): an owner looking at her own page found no way
// to edit or delete a project. Her page and her posts now lead straight there;
// visitors still see Report, never the owner's buttons.
test("an owner edits or deletes a project from her own page and post", async ({ page, browser }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, DEMO_AGENCY.email, DEMO_AGENCY.password);
  await page.goto(`/ar/a/${DEMO_AGENCY.handle}`);
  const panel = page.getByTestId("owner-work-panel");
  await expect(panel.getByTestId("owner-edit-projects")).toContainText("عدّل مشاريعك أو احذفها");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  const postHref = await page.locator('a[href*="/p/"]').first().getAttribute("href");
  await page.goto(postHref!);
  const actions = page.getByTestId("post-owner-actions");
  await expect(actions.getByTestId("delete-post")).toBeVisible();
  await expect(page.getByTestId("report-button")).toHaveCount(0);
  // Deleting asks first; cancelling keeps the post.
  page.once("dialog", (d) => d.dismiss());
  await actions.getByTestId("delete-post").click();
  await expect(page).toHaveURL(new RegExp(postHref!.replace(/^\/ar/, "")));
  await actions.getByTestId("edit-post").click();
  await expect(page).toHaveURL(/\/ar\/studio\/posts\/[0-9a-f-]{36}$/);

  await panel.page().goto(`/ar/a/${DEMO_AGENCY.handle}`);
  await page.getByTestId("owner-edit-projects").click();
  await expect(page).toHaveURL(/\/ar\/studio\/posts$/);

  // A visitor sees Report on the same post, not the owner's buttons.
  const visitor = await browser.newPage();
  await visitor.goto(postHref!);
  await expect(visitor.getByTestId("report-button")).toBeVisible();
  await expect(visitor.getByTestId("post-owner-actions")).toHaveCount(0);
});
