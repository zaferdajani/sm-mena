import { expect, test, type Page } from "@playwright/test";
import { joinAgency, pngBuffer } from "./helpers";

// First-run portfolio setup (docs/53): a new provider lands in five short
// steps, the draft is saved on the server and resumes after reload or "Finish
// later", nothing is public before the explicit publish, and it happens once.

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

test("a new provider sets up a first project: profile, upload, client, project, preview, publish", async ({ page }) => {
  test.setTimeout(120_000);
  const { handle } = await joinAgency(page, "wiz", { stay: true });
  await expect(page).toHaveURL(/\/en\/portfolio-setup$/);
  const wizard = page.getByTestId("setup-wizard");
  await expect(wizard).toHaveAttribute("data-step", "1");
  await expect(page.getByTestId("setup-progress")).toHaveText("Step 1 of 5");
  // Prefilled from sign-up: the name is not asked again.
  await expect(page.getByTestId("setup-name")).toHaveValue(`Agency ${handle}`);
  expect(await noOverflow(page)).toBe(true);

  // 1 — picture and introduction.
  await page.getByTestId("setup-avatar").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: await pngBuffer("#1f7a4d", 400, 400) });
  await page.getByTestId("setup-bio").fill("Product photos and menus for cafés.");
  await page.getByTestId("service-search").fill("photo");
  await page.getByTestId("service-suggestion").first().click();
  await page.getByTestId("setup-profile-save").click();
  await expect(wizard).toHaveAttribute("data-step", "2");

  // 2 — social platforms are listed honestly: none is configured on this server, so no Connect button.
  await page.getByTestId("source-social").click();
  for (const p of ["google", "youtube", "instagram", "facebook", "tiktok"]) {
    await expect(page.getByTestId(`provider-${p}`)).toHaveAttribute("data-ready", "false");
    await expect(page.getByTestId(`provider-blocker-${p}`)).toBeVisible();
    await expect(page.getByTestId(`connect-${p}`)).toHaveCount(0);
  }
  await page.getByTestId("source-upload").click();
  await expect(wizard).toHaveAttribute("data-step", "3");

  // 3 — a new client, added once even if Continue is pressed again after Back.
  await page.getByTestId("client-mode-new").check();
  await page.getByTestId("setup-client-name").fill("Café Nour");
  await page.getByTestId("setup-client-next").click();
  await expect(wizard).toHaveAttribute("data-step", "4");

  // Reload mid-way: the draft resumes on the same step.
  await page.reload();
  await expect(page.getByTestId("setup-wizard")).toHaveAttribute("data-step", "4");

  // 4 — the project: images are stored privately before publishing.
  await page.getByTestId("setup-project-title").fill("Menu launch");
  await page.getByTestId("setup-project-contribution").fill("I shot the photos and designed the menu posts.");
  await page.getByTestId("setup-image-input").setInputFiles([
    { name: "a.png", mimeType: "image/png", buffer: await pngBuffer("#cc3300") },
    { name: "b.png", mimeType: "image/png", buffer: await pngBuffer("#0033cc") },
  ]);
  const media = page.getByTestId("setup-media").locator("li");
  await expect(media).toHaveCount(2, { timeout: 30_000 });
  const second = await media.nth(1).locator("img").getAttribute("src");
  expect(second).toMatch(/^\/api\/setup-media\//);
  // The private image is not reachable by anyone else.
  const anon = await page.context().browser()!.newContext();
  expect((await anon.request.get(`${new URL(page.url()).origin}${second}`)).status()).toBe(404);
  await anon.close();
  await page.getByTestId("setup-make-cover-1").click();
  await expect(media.first().locator("img")).toHaveAttribute("src", second!);
  await page.getByTestId("setup-project-next").click();
  await expect(wizard).toHaveAttribute("data-step", "5");

  // 5 — preview is not publishing: the public page has no project yet.
  await expect(page.getByTestId("setup-preview-card")).toContainText("Menu launch");
  await expect(page.getByTestId("setup-preview-card")).toContainText("For Café Nour");
  const pub = await page.context().browser()!.newContext();
  const visitor = await pub.newPage();
  await visitor.goto(`${new URL(page.url()).origin}/en/a/${handle}`);
  await expect(visitor.getByText("Menu launch")).toHaveCount(0);

  // Edit goes back without losing work.
  await page.getByTestId("setup-edit-project").click();
  await expect(page.getByTestId("setup-project-title")).toHaveValue("Menu launch");
  await page.getByTestId("setup-project-next").click();
  await expect(page.getByTestId("setup-publish")).toBeDisabled();
  await page.getByTestId("setup-rights").check();
  await page.getByTestId("setup-publish").click();
  await expect(page.getByTestId("setup-finished")).toContainText("Your first project is published");
  expect(await noOverflow(page)).toBe(true);

  // Now public: the project page shows it, and the profile lists one project.
  const projectHref = await page.getByRole("link", { name: "View the project" }).getAttribute("href");
  await visitor.goto(`${new URL(page.url()).origin}${projectHref}`);
  await expect(visitor.getByText("Menu launch").first()).toBeVisible();
  await pub.close();

  // The client was added once.
  await page.goto("/en/studio/clients");
  await expect(page.getByText("Café Nour")).toHaveCount(1);
});

test("finish later resumes the saved draft; ordinary Studio routes still work", async ({ page }) => {
  await joinAgency(page, "wizp", { stay: true });
  await page.getByTestId("setup-profile-skip").click();
  await expect(page.getByTestId("setup-wizard")).toHaveAttribute("data-step", "2");
  await page.getByTestId("setup-later").click();
  await expect(page).toHaveURL(/\/en\/studio$/);
  // The Studio offers the setup again (no forced restart), and it resumes at step 2.
  await page.getByTestId("creator-setup-start").click();
  await expect(page.getByTestId("setup-wizard")).toHaveAttribute("data-step", "2");
  await page.goto("/en/studio/profile");
  await expect(page.getByTestId("profile-form")).toBeVisible();
  await page.goto("/en/studio/connections");
  await expect(page.getByTestId("connections-page")).toBeVisible();
  await expect(page.getByTestId("provider-youtube")).toHaveAttribute("data-ready", "false");
});

test("a Behance project comes back into the same draft (Arabic)", async ({ page }) => {
  test.setTimeout(120_000);
  await joinAgency(page, "wizb", { stay: true });
  await page.goto("/ar/portfolio-setup");
  await page.getByTestId("setup-profile-skip").click();
  await page.getByTestId("source-import").click();
  await page.getByTestId("setup-behance-url").fill("behance.net/sawwiqdemo");
  await page.getByTestId("setup-behance-read").click();
  const project = page.getByTestId("setup-behance-project").first();
  await expect(project).toBeVisible({ timeout: 30_000 });
  await project.getByRole("button").click();
  await expect(page.getByTestId("setup-wizard")).toHaveAttribute("data-step", "3");
  // The import's client is only a suggestion.
  await expect(page.getByTestId("setup-client")).toContainText("Rose Boutique");
  await page.getByTestId("client-mode-private").check();
  await page.getByTestId("setup-client-next").click();
  await expect(page.getByTestId("setup-project-title")).not.toHaveValue("");
  await page.getByTestId("setup-project-contribution").fill("صممت الهوية البصرية.");
  // This account skipped the profile step, so it has no services yet: every service is still offered.
  await page.locator('[data-testid^="setup-service-"]').first().check({ force: true });
  await page.getByTestId("setup-project-next").click();
  await expect(page.getByTestId("setup-wizard")).toHaveAttribute("data-step", "5");
  expect(await noOverflow(page)).toBe(true);
});
