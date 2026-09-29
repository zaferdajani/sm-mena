// Controlled signed-in journey on the live site (docs/53): the seeded demo
// provider (a fixture account, is_demo) opens the first-run setup, uploads an
// image, resumes after a reload, saves/publishes one project, checks it, and
// deletes it again. Nothing else is touched; no account is created; the demo
// agency is exempt from Founder seats. Screenshots go to ./live-evidence.
// Env: SITE_URL, DEMO_EMAIL, DEMO_PASSWORD (repository secrets on the runner).
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const site = (process.env.SITE_URL || "https://sawwiq.org").replace(/\/$/, "");
const email = process.env.DEMO_EMAIL;
const password = process.env.DEMO_PASSWORD;
if (!email || !password) {
  console.log("::error::DEMO_EMAIL / DEMO_PASSWORD (the seeded demo provider) are not set; the live journey cannot run.");
  process.exit(2);
}
mkdirSync("live-evidence", { recursive: true });
const shots = [];
const shot = async (page, name) => {
  const file = `live-evidence/${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  shots.push(name);
};
const png = (c) => sharp({ create: { width: 1000, height: 750, channels: 3, background: c } }).png().toBuffer();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ar" });
const page = await ctx.newPage();
const evidence = { site, startedAt: new Date().toISOString(), steps: [] };
const step = (name, ok, detail) => {
  evidence.steps.push({ name, ok, detail });
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) throw new Error(name);
};
let postId = null;
try {
  const version = await (await fetch(`${site}/api/version`)).json();
  evidence.version = version;
  step("version", Boolean(version.commit), `${version.commit} ${version.revision}`);

  await page.goto(`${site}/en/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 30_000 });
  step("sign in", true, new URL(page.url()).pathname);

  await page.goto(`${site}/ar/portfolio-setup`);
  const wizard = page.getByTestId("setup-wizard");
  await wizard.waitFor({ timeout: 30_000 });
  const finished = await page.getByTestId("setup-finished").count();
  if (finished) {
    await page.getByTestId("setup-another").click();
    await wizard.waitFor();
  }
  await shot(page, "1-setup-open");
  const stepAttr = await wizard.getAttribute("data-step");
  step("setup opens", Boolean(stepAttr), `step ${stepAttr}`);
  if (stepAttr === "1") await page.getByTestId("setup-profile-skip").click();
  await page.getByTestId("setup-source").waitFor();
  await page.getByTestId("source-social").click();
  const blockers = await page.locator('[data-testid^="provider-blocker-"]').count();
  const connects = await page.locator('[data-testid^="connect-"]').count();
  step("providers honest", blockers === 5 && connects === 0, `${blockers} blockers, ${connects} connect buttons`);
  await shot(page, "2-source-providers");
  await page.getByTestId("source-upload").click();
  await page.getByTestId("setup-client").waitFor();
  await page.getByTestId("client-mode-private").check();
  await page.getByTestId("setup-client-next").click();
  await page.getByTestId("setup-project").waitFor();
  await page.getByTestId("setup-image-input").setInputFiles([{ name: "a.png", mimeType: "image/png", buffer: await png("#b3541e") }]);
  await page.getByTestId("setup-media").locator("li").first().waitFor({ timeout: 60_000 });
  const mediaSrc = await page.getByTestId("setup-media").locator("img").first().getAttribute("src");
  step("image staged privately", Boolean(mediaSrc?.startsWith("/api/setup-media/")), mediaSrc ?? "");
  const anon = await browser.newContext();
  const anonStatus = (await anon.request.get(`${site}${mediaSrc}`)).status();
  await anon.close();
  step("staged image hidden from others", anonStatus === 404, `HTTP ${anonStatus}`);
  // Resume: a reload keeps the step and the staged image (text is saved on
  // Continue, so it is typed after the reload).
  await page.reload();
  await page.getByTestId("setup-wizard").waitFor();
  const after = await page.getByTestId("setup-wizard").getAttribute("data-step");
  await page.getByTestId("setup-media").locator("li").first().waitFor({ timeout: 30_000 }).catch(() => undefined);
  const kept = await page.getByTestId("setup-media").locator("li").count();
  step("resume after reload", after === "4" && kept === 1, `step ${after}, ${kept} image`);
  await page.getByTestId("setup-project-title").fill("فحص الإعداد المباشر");
  await page.getByTestId("setup-project-contribution").fill("مشروع فحص مؤقت، يُحذف بعد الفحص.");
  await page.locator('[data-testid^="setup-service-"]').first().check({ force: true });
  await shot(page, "3-project");
  await page.getByTestId("setup-project-next").click();
  await page.getByTestId("setup-preview").waitFor();
  const visibility = await page.getByTestId("setup-visibility").getAttribute("data-visibility");
  await shot(page, "4-preview");
  await page.getByTestId("setup-rights").check();
  await page.getByTestId("setup-publish").click();
  await page.getByTestId("setup-finished").waitFor({ timeout: 60_000 });
  await shot(page, "5-finished");
  const href = await page.getByRole("link", { name: /View the project|شوف المشروع/ }).getAttribute("href");
  postId = href?.split("/p/")[1] ?? null;
  step("project saved", Boolean(postId), `visibility ${visibility}, /p/${postId}`);
  await page.goto(`${site}/ar/p/${postId}`);
  const shown = await page.getByText("فحص الإعداد المباشر").first().isVisible();
  step("project page opens for the owner", shown);
  await shot(page, "6-project-page");
} catch (e) {
  evidence.error = String(e?.message ?? e);
  await shot(page, "error").catch(() => undefined);
} finally {
  // Always remove the test project.
  if (postId) {
    try {
      await page.goto(`${site}/en/studio/posts/${postId}`);
      page.once("dialog", (d) => d.accept());
      await page.getByTestId("delete-post").click();
      await page.waitForURL((u) => !u.pathname.includes(postId), { timeout: 30_000 });
      const gone = (await page.request.get(`${site}/en/p/${postId}`)).status();
      step("test project deleted", gone === 404, `HTTP ${gone}`);
    } catch (e) {
      evidence.cleanupError = String(e?.message ?? e);
      console.log(`::error::Could not delete test project ${postId}: ${evidence.cleanupError}`);
    }
  }
  evidence.finishedAt = new Date().toISOString();
  evidence.screenshots = shots;
  writeFileSync("live-evidence/journey.json", JSON.stringify(evidence, null, 2));
  await browser.close();
  process.exit(evidence.error || evidence.cleanupError ? 1 : 0);
}
