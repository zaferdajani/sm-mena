import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { joinAgency, pngBuffer } from "./helpers";
import { expectDecodedPreview, serveBehanceFixtureMedia } from "./behance-fixture-media";

// The one-screen first-run setup (docs/65) on the isolated CI server, not production acceptance.
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await info.attach(name, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
}

test("a new provider shows one project and publishes the page from the same screen", async ({ page }, info) => {
  test.setTimeout(120_000);
  const { handle } = await joinAgency(page, "wiz", { stay: true });
  await expect(page).toHaveURL(/\/en\/portfolio-setup$/);
  await expect(page.getByTestId("setup-wizard")).toBeVisible();
  // Nothing from the old five steps: no stepper, no source cards, no separate client step.
  await expect(page.getByTestId("setup-stepper")).toHaveCount(0);
  await expect(page.getByTestId("source-social")).toHaveCount(0);
  expect(await noOverflow(page)).toBe(true);

  await page.getByTestId("setup-image-input").setInputFiles([
    { name: "a.png", mimeType: "image/png", buffer: await pngBuffer("#cc3300") },
    { name: "b.png", mimeType: "image/png", buffer: await pngBuffer("#0033cc") },
  ]);
  const media = page.getByTestId("setup-media").locator("li");
  await expect(media).toHaveCount(2, { timeout: 30_000 });
  const second = await media.nth(1).locator("img").getAttribute("src");
  expect(second).toMatch(/^\/api\/setup-media\//);
  const anon = await page.context().browser()!.newContext();
  expect((await anon.request.get(`${new URL(page.url()).origin}${second}`)).status()).toBe(404);
  await anon.close();
  await page.getByTestId("setup-make-cover-1").click();
  await expect(media.first().locator("img")).toHaveAttribute("src", second!);

  // The first service names the project; the owner renames it.
  await page.getByTestId("setup-service-photography").check({ force: true });
  await expect(page.getByTestId("setup-project-title")).not.toHaveValue("");
  await page.getByTestId("setup-project-title").fill("Menu launch");
  await page.getByTestId("setup-project-contribution").fill("I shot the photos and designed the menu posts.");
  await page.getByTestId("client-mode-new").check({ force: true });
  await page.getByTestId("setup-client-name").fill("Café Nour");

  // The publish box: the page is private until the owner chooses otherwise, and nothing goes out without the rights box.
  // (In the launch phases of this suite a new page is already public; during registration it starts private.)
  const publish = page.getByTestId("setup-publish");
  const startedPrivate = (await page.getByTestId("setup-visibility").getAttribute("data-visibility")) === "private";
  await expect(publish).toBeDisabled();
  await page.getByTestId("visibility-public").check({ force: true });
  await expect(page.getByTestId("setup-visibility")).toHaveAttribute("data-visibility", "public");
  await expect(publish).toHaveText("Publish my page");
  await page.getByTestId("setup-rights").check();
  if (startedPrivate) {
    await expect(publish).toBeDisabled(); // the audience change still needs its acknowledgement
    await page.getByTestId("setup-acknowledge").check();
  } else {
    await expect(page.getByTestId("setup-acknowledge")).toHaveCount(0);
  }
  await expect(publish).toBeEnabled();
  await capture(page, info, "en-one-screen-ready");

  // Nobody can see the project before publishing.
  const pub = await page.context().browser()!.newContext();
  const visitor = await pub.newPage();
  if (startedPrivate) expect((await pub.request.get(`${new URL(page.url()).origin}/en/a/${handle}`)).status()).toBe(404);
  await visitor.goto(`${new URL(page.url()).origin}/en/a/${handle}`);
  await expect(visitor.getByText("Menu launch")).toHaveCount(0);

  await publish.click();
  const finished = page.getByTestId("setup-finished");
  await expect(finished).toHaveAttribute("data-visibility", "public");
  await expect(finished).toContainText("Your page is live");
  await expect(page.getByTestId("setup-page-link")).toContainText(`/a/${handle}`);
  await expect(page.getByTestId("setup-share-whatsapp")).toHaveAttribute("href", /wa\.me/);
  expect(await noOverflow(page)).toBe(true);
  await capture(page, info, "en-live");

  const opened = await visitor.goto(`${new URL(page.url()).origin}/en/a/${handle}`);
  expect(opened?.status()).toBe(200);
  const projectHref = await page.getByRole("link", { name: "View the project" }).getAttribute("href");
  await visitor.goto(`${new URL(page.url()).origin}${projectHref}`);
  await expect(visitor.getByText("Menu launch").first()).toBeVisible();
  await expect(visitor.getByText("Café Nour").first()).toBeVisible();
  await pub.close();
  // The live screen carries the two trust controls (docs/65): "open to new projects" and a review request.
  await expect(page.getByTestId("availability-toggle")).toHaveAttribute("data-state", "open");
  await expect(page.getByTestId("setup-review-invite")).toBeVisible();
  await page.getByTestId("availability-switch").uncheck({ force: true });
  await expect(page.getByTestId("availability-toggle")).toHaveAttribute("data-state", "closed");
  const paused = await page.context().browser()!.newContext();
  const reader = await paused.newPage();
  await reader.goto(`${new URL(page.url()).origin}/en/a/${handle}`);
  await expect(reader.getByTestId("availability-badge")).toHaveAttribute("data-state", "closed");
  await paused.close();
  await page.getByTestId("availability-switch").check({ force: true });
  await expect(page.getByTestId("availability-toggle")).toHaveAttribute("data-state", "open");
  await page.goto("/en/studio/clients");
  await expect(page.getByText("Café Nour")).toHaveCount(1);
  // The project's service became the page's service: asked once.
  await page.goto("/en/studio/profile");
  await expect(page.locator('input[name="services"][value="photography"]')).toHaveCount(1);
});

test("finish later keeps the draft; the Studio's next step leads back; ordinary Studio routes still work", async ({ page }) => {
  await joinAgency(page, "wizp", { stay: true });
  await page.getByTestId("setup-project-title").fill("Unfinished title");
  await page.getByTestId("setup-later").click();
  await expect(page).toHaveURL(/\/en\/studio$/);
  // Honest progress: nothing is ticked yet, the next step is the first work.
  const strength = page.getByTestId("page-strength");
  await expect(strength).toHaveAttribute("data-next", "work");
  await expect(page.getByTestId("page-status")).toBeVisible();
  await page.getByTestId("page-next-step").click();
  await expect(page).toHaveURL(/\/en\/portfolio-setup$/);
  await expect(page.getByTestId("setup-project-title")).toHaveValue("Unfinished title");
  await page.goto("/en/studio/profile");
  await expect(page.getByTestId("profile-form")).toBeVisible();
  await page.goto("/en/studio/connections");
  await expect(page.getByTestId("connections-page")).toBeVisible();
  await expect(page.getByTestId("provider-youtube")).toHaveAttribute("data-ready", "false");
});

test("a Behance project comes into the same screen (Arabic)", async ({ page }, info) => {
  test.setTimeout(120_000);
  await serveBehanceFixtureMedia(page);
  await joinAgency(page, "wizb", { stay: true });
  await page.goto("/ar/portfolio-setup");
  await page.getByTestId("source-import").click();
  await page.getByTestId("setup-behance-url").fill("behance.net/sawwiqdemo");
  await page.getByTestId("setup-behance-read").click();
  const project = page.getByTestId("setup-behance-project").first();
  await expect(project).toBeVisible({ timeout: 30_000 });
  await project.getByRole("button").click();
  await expect(page.getByTestId("setup-media").locator("li").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("setup-project-title")).not.toHaveValue("");
  await expect(page.getByTestId("setup-client")).toContainText("Rose Boutique");
  await expectDecodedPreview(page.getByTestId("setup-media"), 2);
  expect(await noOverflow(page)).toBe(true);
  await capture(page, info, "ar-imported-project");
  await page.getByTestId("client-mode-private").check({ force: true });
  await page.locator('[data-testid^="setup-service-"]').first().check({ force: true });
  const current = await page.getByTestId("setup-visibility").getAttribute("data-visibility");
  await page.getByTestId("setup-rights").check();
  await page.getByTestId("setup-publish").click();
  // The audience is kept as it was: a private page offers publishing right here, an open one shows its link.
  await expect(page.getByTestId("setup-finished")).toHaveAttribute("data-visibility", current!);
  await expect(page.getByTestId(current === "private" ? "setup-publish-later" : "setup-page-link")).toBeVisible();
});

test("the setup media route is the owner's only", async ({ page }) => {
  await joinAgency(page, "wizsec", { stay: true });
  await page.getByTestId("setup-image-input").setInputFiles({ name: "a.png", mimeType: "image/png", buffer: await pngBuffer("#7a1f4d") });
  const img = page.getByTestId("setup-media").locator("img").first();
  await expect(img).toBeVisible({ timeout: 30_000 });
  const src = await img.getAttribute("src");
  const other = await page.context().browser()!.newContext();
  const otherPage = await other.newPage();
  await joinAgency(otherPage, "wizsec2", { stay: true });
  expect((await other.request.get(`${new URL(page.url()).origin}${src}`)).status()).toBe(404);
  await other.close();
});
